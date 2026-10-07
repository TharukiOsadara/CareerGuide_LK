const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/db');
const { signToken, publicUser } = require('../utils/token');
const { authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { GOOGLE_CLIENT_ID, JWT_SECRET } = require('../config/env');
const { generateSecret, verifyCode, otpauthUrl } = require('../utils/totp');

const router = express.Router();
const googleClient = new OAuth2Client();
// GOOGLE_CLIENT_ID may list several OAuth client IDs (comma-separated); the Web client ID is required.
const googleAudiences = GOOGLE_CLIENT_ID.split(',').map((s) => s.trim()).filter(Boolean);

const initials = (name = '') =>
  name.trim().split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase() || 'U';

const clientMeta = (req) => ({
  ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim(),
  device: (req.headers['user-agent'] || 'Unknown device').slice(0, 118),
});

async function logAccess(user, action, req) {
  const { ip, device } = clientMeta(req);
  await query(
    `INSERT INTO access_logs (user_id, user_name, role, action, ip_address, device)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user?.id || null, user?.full_name || null, user?.role || null, action, ip, device]
  );
}

async function openSession(user, req) {
  const { ip, device } = clientMeta(req);
  await query('UPDATE sessions SET active = FALSE WHERE user_id = $1', [user.id]);
  await query(
    `INSERT INTO sessions (user_id, user_name, role, ip_address, device, active)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    [user.id, user.full_name, user.role, ip, device]
  );
}

// Final step of every password login: record it, open a session, return the JWT.
async function completeLogin(user, req, res) {
  await query('UPDATE users SET last_login_at = NOW(), failed_attempts = 0 WHERE id = $1', [user.id]);
  await logAccess(user, 'login', req);
  await openSession(user, req);
  const token = signToken(user);
  res.json({ token, user: publicUser({ ...user, last_login_at: new Date() }) });
}

// --- Admin two-factor (authenticator app) ---
// The ticket proves the password step passed. It is signed with a key derived from
// JWT_SECRET, so it can never be used as a normal session token, and expires quickly.
const MFA_KEY = crypto.createHmac('sha256', JWT_SECRET).update('admin-mfa-ticket').digest('hex');
const MFA_MAX_FAILS = 5;
const MFA_COOLDOWN_MIN = 15;

const signMfaTicket = (user) => jwt.sign({ id: user.id, purpose: 'admin-mfa' }, MFA_KEY, { expiresIn: '10m' });

// Loads the admin behind a ticket, or sends the error response and returns null.
async function adminFromTicket(req, res) {
  let payload;
  try {
    payload = jwt.verify(req.body?.mfaToken || '', MFA_KEY);
  } catch {
    res.status(401).json({ message: 'Your sign-in step expired. Please enter your password again.', restart: true });
    return null;
  }
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [payload.id]);
  const user = rows[0];
  if (!user || user.role !== 'admin' || !user.admin_approved) {
    res.status(403).json({ message: 'Admin access required.', restart: true });
    return null;
  }
  if (user.status === 'blocked' || user.status === 'locked') {
    res.status(403).json({ message: `This account is ${user.status}.`, restart: true });
    return null;
  }
  return user;
}

// First-time setup: returns the secret as a QR code to scan with the authenticator app.
router.post('/admin/mfa/setup', async (req, res) => {
  try {
    const user = await adminFromTicket(req, res);
    if (!user) return;
    if (user.totp_enabled) {
      return res.status(400).json({ message: 'Authenticator is already set up for this account.' });
    }
    // Reuse an unconfirmed secret so a QR that was already scanned keeps working.
    let secret = user.totp_secret;
    if (!secret) {
      secret = generateSecret();
      await query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret, user.id]);
    }
    const url = otpauthUrl({ secret, account: user.email });
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240 });
    res.json({ secret, otpauthUrl: url, qrDataUrl, account: user.email });
  } catch (err) {
    console.error('mfa setup error', err);
    res.status(500).json({ message: 'Could not start authenticator setup.' });
  }
});

// Checks the 6-digit code; on success finishes the login (and enables 2FA on first use).
router.post('/admin/mfa/verify', async (req, res) => {
  try {
    const user = await adminFromTicket(req, res);
    if (!user) return;
    if (!user.totp_secret) {
      return res.status(400).json({ message: 'Set up your authenticator app first.', setupRequired: true });
    }
    if (user.totp_locked_until && new Date(user.totp_locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.totp_locked_until) - Date.now()) / 60000);
      return res.status(429).json({ message: `Too many wrong codes. Try again in ${mins} minute(s).` });
    }

    const step = verifyCode(user.totp_secret, req.body?.code, {
      lastUsedStep: user.totp_last_step == null ? null : Number(user.totp_last_step),
    });

    if (step === null) {
      const fails = (user.totp_failed || 0) + 1;
      await logAccess(user, 'failed_login', req);
      if (fails >= MFA_MAX_FAILS) {
        await query(
          `UPDATE users SET totp_failed = 0, totp_locked_until = NOW() + ($1 || ' minutes')::interval WHERE id = $2`,
          [String(MFA_COOLDOWN_MIN), user.id]
        );
        return res.status(429).json({ message: `Too many wrong codes. Code entry is blocked for ${MFA_COOLDOWN_MIN} minutes.` });
      }
      await query('UPDATE users SET totp_failed = $1 WHERE id = $2', [fails, user.id]);
      const left = MFA_MAX_FAILS - fails;
      return res.status(401).json({ message: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` });
    }

    await query(
      `UPDATE users SET totp_enabled = TRUE, totp_failed = 0, totp_last_step = $1, totp_locked_until = NULL
       WHERE id = $2`,
      [step, user.id]
    );
    await completeLogin({ ...user, totp_enabled: true }, req, res);
  } catch (err) {
    console.error('mfa verify error', err);
    res.status(500).json({ message: 'Could not verify the code.' });
  }
});

// --- Email -> role lookup (shown in the sign-in email field corner) ---
// Matches an exact email first, then falls back to a prefix match so the role
// shows up as the user types "savindi@" before finishing the address.
router.get('/role-lookup', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (email.length < 3) return res.json({ found: false });

  let { rows } = await query('SELECT role, status FROM users WHERE email = $1', [email]);
  if (!rows.length) {
    const r = await query(
      'SELECT role, status FROM users WHERE email ILIKE $1 ORDER BY email LIMIT 1',
      [`${email}%`]
    );
    rows = r.rows;
  }
  if (!rows.length) return res.json({ found: false });
  res.json({ found: true, role: rows[0].role, status: rows[0].status });
});

// --- Sign up ---
router.post('/signup', async (req, res) => {
  try {
    const {
      fullName, email, password, role = 'student', alStream, zScore,
      childEmail1, childEmail2,
    } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email and password are required.' });
    }
    if (!['student', 'parent', 'counsellor'].includes(role)) {
      return res.status(400).json({ message: 'Public signup is only for student, parent or counsellor.' });
    }
    if (role === 'student' && zScore !== undefined && zScore !== null
      && (!Number.isFinite(Number(zScore)) || Number(zScore) < 0 || Number(zScore) > 4)) {
      return res.status(400).json({ message: 'Z-score must be a number between 0 and 4.' });
    }
    const childEmails = role === 'parent'
      ? [...new Set([childEmail1, childEmail2].map((value) => (value || '').toLowerCase().trim()).filter(Boolean))]
      : [];
    if (role === 'parent' && childEmails.length === 0) {
      return res.status(400).json({ message: 'Enter at least one existing student email address.' });
    }
    const normEmail = email.toLowerCase().trim();
    const exists = await query('SELECT id FROM users WHERE email = $1', [normEmail]);
    if (exists.rows.length) return res.status(409).json({ message: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, password_hash, role, al_stream, z_score, avatar_initials, status, admin_approved, profile_completion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', TRUE, 45) RETURNING *`,
      [fullName.trim(), normEmail, hash, role, alStream || null,
        role === 'student' && zScore !== undefined && zScore !== '' ? Number(zScore) : null,
        initials(fullName)]
    );
    const user = rows[0];
    if (role === 'parent') {
      const { rows: children } = await query(
        'SELECT id, email FROM users WHERE lower(email) = ANY($1::text[]) AND role = $2 AND status = $3',
        [childEmails, 'student', 'active']
      );
      const found = new Set(children.map((child) => child.email.toLowerCase()));
      const missing = childEmails.filter((childEmail) => !found.has(childEmail));
      if (missing.length) {
        await query('DELETE FROM users WHERE id = $1', [user.id]);
        return res.status(400).json({
          message: `These student email(s) are not valid active student accounts: ${missing.join(', ')}`,
        });
      }
      await Promise.all(children.map((child) => query(
        `INSERT INTO parent_student_links (parent_id, student_id)
         VALUES ($1, $2) ON CONFLICT (parent_id, student_id) DO NOTHING`,
        [user.id, child.id]
      )));
    }
    await logAccess(user, 'login', req);
    await openSession(user, req);
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser({ ...user, last_login_at: new Date() }) });
  } catch (err) {
    console.error('signup error', err);
    res.status(500).json({ message: 'Could not create account.' });
  }
});

// --- Admin self-registration (stays pending until a super admin approves) ---
router.post('/admin/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const normEmail = email.toLowerCase().trim();
    const exists = await query('SELECT id FROM users WHERE email = $1', [normEmail]);
    if (exists.rows.length) return res.status(409).json({ message: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, password_hash, role, avatar_initials, status, admin_approved, profile_completion)
       VALUES ($1, $2, $3, 'admin', $4, 'pending', FALSE, 50) RETURNING *`,
      [fullName.trim(), normEmail, hash, initials(fullName)]
    );
    res.status(201).json({
      message: 'Admin request submitted. You can sign in once a super admin approves your account.',
      user: publicUser(rows[0]),
    });
  } catch (err) {
    console.error('admin register error', err);
    res.status(500).json({ message: 'Could not submit admin request.' });
  }
});

// --- Sign in (role enforced) ---
router.post('/signin', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const normEmail = email.toLowerCase().trim();
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [normEmail]);

    if (!rows.length) {
      await logAccess({ full_name: normEmail, role: role || 'unknown' }, 'failed_login', req);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const user = rows[0];

    if (user.status === 'blocked') return res.status(403).json({ message: 'This account has been blocked. Contact an administrator.' });
    if (user.status === 'locked') return res.status(403).json({ message: 'This account is locked due to suspicious activity.' });

    const ok = user.password_hash && (await bcrypt.compare(password, user.password_hash));
    if (!ok) {
      await query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = $1', [user.id]);
      await logAccess(user, 'failed_login', req);
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Role-based access: the selected tab must match the account's role.
    if (role && role !== user.role) {
      return res.status(403).json({
        message: `This is a ${user.role} account. Please sign in from the ${user.role} tab.`,
        actualRole: user.role,
      });
    }

    if (user.role === 'admin' && !user.admin_approved) {
      if (user.admin_rejected) {
        return res.status(403).json({
          message: 'Your admin request was not approved by the super admin. Please contact the administrator.',
        });
      }
      return res.status(403).json({ message: 'Your admin account is awaiting approval from a super admin.' });
    }

    // Admins need a second step: a 6-digit code from their authenticator app.
    // No session token is issued until that code is verified.
    if (user.role === 'admin') {
      return res.json({
        mfaRequired: true,
        setupRequired: !user.totp_enabled,
        mfaToken: signMfaTicket(user),
      });
    }

    await completeLogin(user, req, res);
  } catch (err) {
    console.error('signin error', err);
    res.status(500).json({ message: 'Could not sign in.' });
  }
});

// --- Google OAuth (verify ID token, upsert user) ---
router.post('/google', async (req, res) => {
  try {
    const { idToken, role = 'student' } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Google idToken is required.' });
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: 'Google sign-in is not configured on the server.' });
    }
    const ticket = await googleClient.verifyIdToken({ idToken, audience: googleAudiences });
    const payload = ticket.getPayload();
    if (!payload.email || !payload.email_verified) {
      return res.status(401).json({ message: 'Your Google email address is not verified.' });
    }
    const normEmail = payload.email.toLowerCase();

    let { rows } = await query('SELECT * FROM users WHERE email = $1', [normEmail]);
    let user = rows[0];
    if (!user) {
      const ins = await query(
        `INSERT INTO users (full_name, email, role, provider, google_id, avatar_initials, status, admin_approved, profile_completion)
         VALUES ($1, $2, $3, 'google', $4, $5, 'active', TRUE, 45) RETURNING *`,
        [payload.name || normEmail, normEmail, ['student', 'parent', 'counsellor'].includes(role) ? role : 'student', payload.sub, initials(payload.name)]
      );
      user = ins.rows[0];
    }
    if (user.status === 'blocked' || user.status === 'locked') {
      return res.status(403).json({ message: `This account is ${user.status}.` });
    }
    // Admins must use the Admin Portal (keeps admin approval and staff checks in one place).
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts must sign in through the Admin Portal.' });
    }
    if (!user.google_id) await query('UPDATE users SET google_id = $1 WHERE id = $2', [payload.sub, user.id]);
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    await logAccess(user, 'login', req);
    await openSession(user, req);
    const token = signToken(user);
    res.json({ token, user: publicUser({ ...user, last_login_at: new Date() }) });
  } catch (err) {
    console.error('google auth error', err);
    res.status(401).json({ message: 'Google sign-in failed.' });
  }
});

// --- Forgot password: issue a reset token ---
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
    // Always respond success to avoid leaking which emails exist.
    if (rows.length) {
      const token = crypto.randomBytes(24).toString('hex');
      await query(
        `UPDATE users SET reset_token = $1, reset_expires = NOW() + INTERVAL '1 hour' WHERE id = $2`,
        [token, rows[0].id]
      );
      // In production this token is emailed. For the demo we return it so the flow works end-to-end.
      return res.json({ message: 'Reset instructions sent.', resetToken: token });
    }
    res.json({ message: 'If that email exists, reset instructions have been sent.' });
  } catch (err) {
    console.error('forgot password error', err);
    res.status(500).json({ message: 'Could not process request.' });
  }
});

// --- Reset password ---
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ message: 'A new password is required.' });

    let userRow;
    if (token) {
      const { rows } = await query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()', [token]
      );
      userRow = rows[0];
    } else if (email) {
      const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      userRow = rows[0];
    }
    if (!userRow) return res.status(400).json({ message: 'Invalid or expired reset link.' });

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hash, userRow.id]
    );
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('reset password error', err);
    res.status(500).json({ message: 'Could not reset password.' });
  }
});

// --- Current user ---
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// --- Logout ---
router.post('/logout', authenticate, async (req, res) => {
  await query('UPDATE sessions SET active = FALSE WHERE user_id = $1', [req.user.id]);
  await logAccess(req.user, 'logout', req);
  res.json({ message: 'Signed out.' });
});

module.exports = router;
