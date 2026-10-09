const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { query } = require('../config/db');
const { signToken, publicUser } = require('../utils/token');
const { authenticate } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET } = require('../config/env');
const { getPublicUrl } = require('../config/runtime');
const { generateSecret, verifyCode, otpauthUrl } = require('../utils/totp');
const v = require('../utils/validate');
const matching = require('../services/counsellorMatching');
const { sendMail } = require('../utils/mailer');

const router = express.Router();

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
      childEmail1, childEmail2, counsellorCourseIds,
    } = req.body;
    if (!['student', 'parent', 'counsellor'].includes(role)) {
      return res.status(400).json({ message: 'Public signup is only for student, parent or counsellor.' });
    }
    const invalid = v.first(
      v.name(fullName),
      v.email(email),
      v.newPassword(password),
      role === 'student' ? (v.required(alStream, 'A/L stream') || (v.AL_STREAMS.includes(alStream) ? '' : 'Choose a valid A/L stream.')) : '',
      role === 'student' ? v.number(zScore, 'Z-score', { min: 0, max: 4, decimals: 4 }) : '',
      role === 'parent' ? v.email(childEmail1, 'Child 1 email') : '',
      role === 'parent' && childEmail2 ? v.email(childEmail2, 'Child 2 email') : '',
      role === 'counsellor' ? v.courseIds(counsellorCourseIds) : '',
    );
    if (invalid) return res.status(400).json({ message: invalid });
    if (role === 'counsellor') {
      const found = await query('SELECT COUNT(*)::int AS n FROM courses_list WHERE id = ANY($1::int[])',
        [counsellorCourseIds.map(Number)]);
      if (found.rows[0].n !== new Set(counsellorCourseIds.map(Number)).size) {
        return res.status(400).json({ message: 'One or more selected courses do not exist.' });
      }
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
    if (role === 'counsellor') {
      // The courses this counsellor guides: students choosing them can be matched to them.
      await matching.setCounsellorCourses(user.id, counsellorCourseIds);
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
    const invalid = v.first(v.name(fullName), v.email(email), v.newPassword(password));
    if (invalid) return res.status(400).json({ message: invalid });
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
    const badEmail = v.email(email);
    if (badEmail) return res.status(400).json({ message: badEmail });
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

// --- Google sign-in (browser flow; works inside Expo Go) ---
// 1. The app opens  GET /google/start  in a browser tab.
// 2. We send the user to Google; Google sends them back to  GET /google/callback  (PUBLIC_URL).
// 3. We sign them in and bounce the browser back to the app with a one-time code.
// 4. The app swaps that code for a session at  POST /google/exchange.
// The public address can be set when the ngrok tunnel starts, so it is read per request.
const googleCallback = () => `${getPublicUrl()}/api/auth/google/callback`;
const googleEnabled = () => Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && getPublicUrl());
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
const STATE_KEY = crypto.createHmac('sha256', JWT_SECRET).update('google-oauth-state').digest('hex');
const GOOGLE_ROLES = ['student', 'parent', 'counsellor'];

// Only send the browser back to the app itself (Expo Go / app scheme / local web), never elsewhere.
const isAllowedReturn = (url) =>
  /^(exp|exps|careerguidelk):\/\//i.test(url || '') || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url || '');

// One-time codes handed to the app after Google sign-in (short-lived, in memory).
const googleHandoffs = new Map();
const HANDOFF_MS = 2 * 60 * 1000;

function withParams(url, params) {
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + new URLSearchParams(params).toString();
}

// Small page that sends the browser back into the app (with a manual link as fallback).
function backToApp(res, url) {
  const safe = url.replace(/"/g, '&quot;');
  res.set('Content-Type', 'text/html').send(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>CareerGuide LK</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 20px;color:#0F172A">
<h2 style="color:#0052CC">CareerGuide LK</h2><p>Returning to the app…</p>
<p><a href="${safe}" style="display:inline-block;background:#0052CC;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Open CareerGuide</a></p>
<script>window.location.replace(${JSON.stringify(url)});</script></body></html>`);
}

// Finds or creates the account for a verified Google profile. Throws { status, message } on refusal.
async function googleLogin(payload, role, req) {
  if (!payload.email || !payload.email_verified) {
    throw { status: 401, message: 'Your Google email address is not verified.' };
  }
  const normEmail = payload.email.toLowerCase();
  // Everything Google shares with us (with the user's consent) is stored on the account.
  const g = {
    sub: payload.sub,
    name: (payload.name || '').slice(0, 150) || normEmail,
    given: (payload.given_name || '').slice(0, 100) || null,
    family: (payload.family_name || '').slice(0, 100) || null,
    picture: payload.picture || null,
    locale: (payload.locale || '').slice(0, 20) || null,
  };
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [normEmail]);
  let user = rows[0];
  if (!user) {
    // New Google account: created with the chosen role, then the user completes
    // their profile (A/L stream & Z-score, or their children's emails) in the app.
    const ins = await query(
      `INSERT INTO users (full_name, email, role, provider, google_id, avatar_initials, status, admin_approved,
                          profile_completion, profile_completed, email_verified, avatar_url,
                          google_given_name, google_family_name, google_locale, google_linked_at)
       VALUES ($1, $2, $3, 'google', $4, $5, 'active', TRUE, 30, FALSE, TRUE, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [g.name, normEmail, GOOGLE_ROLES.includes(role) ? role : 'student', g.sub, initials(g.name),
        g.picture, g.given, g.family, g.locale]
    );
    user = ins.rows[0];
  }
  if (user.status === 'blocked' || user.status === 'locked') {
    throw { status: 403, message: `This account is ${user.status}.` };
  }
  // Admins must use the Admin Portal (password + authenticator code).
  if (user.role === 'admin') {
    throw { status: 403, message: 'Admin accounts must sign in through the Admin Portal.' };
  }
  // Refresh the stored Google details on every Google login (the user's own name is kept).
  const { rows: updated } = await query(
    `UPDATE users SET
       google_id = COALESCE(google_id, $1),
       google_linked_at = COALESCE(google_linked_at, NOW()),
       email_verified = TRUE,
       avatar_url = COALESCE($2, avatar_url),
       google_given_name = COALESCE($3, google_given_name),
       google_family_name = COALESCE($4, google_family_name),
       google_locale = COALESCE($5, google_locale),
       google_last_login_at = NOW(),
       last_login_at = NOW()
     WHERE id = $6 RETURNING *`,
    [g.sub, g.picture, g.given, g.family, g.locale, user.id]
  );
  user = updated[0];
  await logAccess(user, 'login', req);
  await openSession(user, req);
  return { token: signToken(user), user: publicUser(user) };
}

// Tells the app whether Google sign-in is set up, and where to start it.
router.get('/google/config', (req, res) => {
  res.json({ enabled: googleEnabled(), startUrl: googleEnabled() ? `${getPublicUrl()}/api/auth/google/start` : null });
});

router.get('/google/start', (req, res) => {
  const { role = 'student', returnTo = '' } = req.query;
  if (!googleEnabled()) return res.status(503).send('Google sign-in is not configured on the server.');
  if (!isAllowedReturn(returnTo)) return res.status(400).send('Invalid return address.');
  const state = jwt.sign(
    { role: GOOGLE_ROLES.includes(role) ? role : 'student', returnTo },
    STATE_KEY,
    { expiresIn: '10m' }
  );
  const url = googleClient.generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    redirect_uri: googleCallback(),
    state,
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  let state;
  try {
    state = jwt.verify(String(req.query.state || ''), STATE_KEY);
  } catch {
    return res.status(400).send('This sign-in link expired. Go back to the app and try again.');
  }
  const fail = (message) => backToApp(res, withParams(state.returnTo, { error: message }));
  if (req.query.error) return fail(req.query.error === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed.');
  try {
    const { tokens } = await googleClient.getToken({ code: String(req.query.code || ''), redirect_uri: googleCallback() });
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    const session = await googleLogin(ticket.getPayload(), state.role, req);
    const code = crypto.randomBytes(24).toString('hex');
    googleHandoffs.set(code, { ...session, expires: Date.now() + HANDOFF_MS });
    backToApp(res, withParams(state.returnTo, { code }));
  } catch (err) {
    if (err && err.status) return fail(err.message);
    console.error('google callback error', err);
    fail('Google sign-in failed. Please try again.');
  }
});

// The app trades the one-time code for its session (token + user). Codes work once.
router.post('/google/exchange', (req, res) => {
  const code = String(req.body?.code || '');
  const entry = googleHandoffs.get(code);
  googleHandoffs.delete(code);
  for (const [k, v] of googleHandoffs) if (v.expires < Date.now()) googleHandoffs.delete(k);
  if (!entry || entry.expires < Date.now()) {
    return res.status(400).json({ message: 'Google sign-in expired. Please try again.' });
  }
  res.json({ token: entry.token, user: entry.user });
});

// --- Forgot password: issue a reset token ---
// --- Password reset (6-digit code sent to the account's email) ---
// Only a hash of the code is stored. It expires after 15 minutes and is cleared after
// 5 wrong tries. The code is never returned in an API response.
const RESET_CODE_MINUTES = 15;
const RESET_MAX_ATTEMPTS = 5;
const hashResetCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

router.post('/forgot-password', async (req, res) => {
  try {
    const invalid = v.email(req.body.email);
    if (invalid) return res.status(400).json({ message: invalid });
    const email = req.body.email.toLowerCase().trim();
    const generic = { message: 'If an account exists for that email, a 6-digit reset code has been sent.' };

    const { rows } = await query('SELECT id, full_name, status FROM users WHERE email = $1', [email]);
    const user = rows[0];
    // Same response whether or not the account exists, so emails can't be discovered.
    if (!user || user.status === 'blocked') return res.json(generic);

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await query(
      `UPDATE users SET reset_token = $1, reset_expires = NOW() + ($2 || ' minutes')::interval, reset_attempts = 0
       WHERE id = $3`,
      [hashResetCode(code), String(RESET_CODE_MINUTES), user.id]
    );
    await sendMail({
      to: email,
      subject: 'Your CareerGuide LK password reset code',
      text: `Hi ${user.full_name || ''},\n\nYour password reset code is: ${code}\n\n`
        + `It expires in ${RESET_CODE_MINUTES} minutes. If you did not ask to reset your password, ignore this email.\n\nCareerGuide LK`,
    });
    res.json(generic);
  } catch (err) {
    console.error('forgot password error', err);
    res.status(500).json({ message: 'Could not process request.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const invalid = v.first(
      v.email(email),
      /^\d{6}$/.test(String(code || '')) ? '' : 'Enter the 6-digit code from your email.',
      v.newPassword(newPassword, 'New password'),
    );
    if (invalid) return res.status(400).json({ message: invalid });

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];
    const expired = !user || !user.reset_token || !user.reset_expires || new Date(user.reset_expires) < new Date();
    if (expired) {
      return res.status(400).json({ message: 'This reset code has expired. Please request a new one.', restart: true });
    }

    const ok = crypto.timingSafeEqual(Buffer.from(hashResetCode(code)), Buffer.from(user.reset_token));
    if (!ok) {
      const attempts = (user.reset_attempts || 0) + 1;
      if (attempts >= RESET_MAX_ATTEMPTS) {
        await query('UPDATE users SET reset_token = NULL, reset_expires = NULL, reset_attempts = 0 WHERE id = $1', [user.id]);
        return res.status(400).json({ message: 'Too many wrong codes. Please request a new code.', restart: true });
      }
      await query('UPDATE users SET reset_attempts = $1 WHERE id = $2', [attempts, user.id]);
      const left = RESET_MAX_ATTEMPTS - attempts;
      return res.status(400).json({ message: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL, reset_attempts = 0,
              failed_attempts = 0
       WHERE id = $2`,
      [hash, user.id]
    );
    // Sign out everywhere after a password change.
    await query('UPDATE sessions SET active = FALSE WHERE user_id = $1', [user.id]);
    // The role tells the app which sign-in screen to open next.
    res.json({ message: 'Password updated successfully.', role: user.role });
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
