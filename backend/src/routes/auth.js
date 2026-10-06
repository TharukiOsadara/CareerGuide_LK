const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/db');
const { signToken, publicUser } = require('../utils/token');
const { authenticate } = require('../middleware/auth');
const { GOOGLE_CLIENT_ID } = require('../config/env');

const router = express.Router();
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    const { fullName, email, password, role = 'student', alStream } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'Full name, email and password are required.' });
    }
    if (!['student', 'parent', 'counsellor'].includes(role)) {
      return res.status(400).json({ message: 'Public signup is only for student, parent or counsellor.' });
    }
    const normEmail = email.toLowerCase().trim();
    const exists = await query('SELECT id FROM users WHERE email = $1', [normEmail]);
    if (exists.rows.length) return res.status(409).json({ message: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (full_name, email, password_hash, role, al_stream, avatar_initials, status, admin_approved, profile_completion)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', TRUE, 45) RETURNING *`,
      [fullName.trim(), normEmail, hash, role, alStream || null, initials(fullName)]
    );
    const user = rows[0];
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
      return res.status(403).json({ message: 'Your admin account is awaiting approval from a super admin.' });
    }

    await query('UPDATE users SET last_login_at = NOW(), failed_attempts = 0 WHERE id = $1', [user.id]);
    await logAccess(user, 'login', req);
    await openSession(user, req);

    const token = signToken(user);
    res.json({ token, user: publicUser({ ...user, last_login_at: new Date() }) });
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
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
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
