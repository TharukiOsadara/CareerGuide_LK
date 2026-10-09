const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { publicUser } = require('../utils/token');
const v = require('../utils/validate');
const matching = require('../services/counsellorMatching');

const router = express.Router();

// List users (admin). Optional ?role= & ?status= & ?q= filters.
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { role, status, q } = req.query;
  const clauses = [];
  const params = [];
  if (role) { params.push(role); clauses.push(`role = $${params.length}`); }
  if (status) { params.push(status); clauses.push(`status = $${params.length}`); }
  if (q) { params.push(`%${q}%`); clauses.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM users ${where} ORDER BY created_at DESC`, params);
  res.json({ users: rows.map(publicUser) });
});

// Pending admin requests (super admin approves these).
router.get('/admin-requests', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM users
     WHERE role = 'admin' AND admin_approved = FALSE AND admin_rejected = FALSE
     ORDER BY created_at DESC`
  );
  res.json({ requests: rows.map(publicUser) });
});

router.post('/:id/approve-admin', authenticate, requireAdmin, async (req, res) => {
  if (!req.user.is_super_admin) return res.status(403).json({ message: 'Only a super admin can approve admins.' });
  const { rows } = await query(
    `UPDATE users SET admin_approved = TRUE, admin_rejected = FALSE, status = 'active'
     WHERE id = $1 AND role = 'admin' AND admin_approved = FALSE RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Admin request not found.' });
  res.json({ user: publicUser(rows[0]) });
});

router.post('/:id/reject-admin', authenticate, requireAdmin, async (req, res) => {
  if (!req.user.is_super_admin) return res.status(403).json({ message: 'Only a super admin can reject admins.' });
  const { rowCount } = await query(
    `UPDATE users SET admin_rejected = TRUE, status = 'pending'
     WHERE id = $1 AND role = 'admin' AND admin_approved = FALSE`,
    [req.params.id]
  );
  if (!rowCount) return res.status(404).json({ message: 'Admin request not found.' });
  res.json({ message: 'Admin request rejected.' });
});

// Lock / unlock / block / unblock
const setStatus = (status) => async (req, res) => {
  const { rows } = await query(
    `UPDATE users SET status = $1 WHERE id = $2 AND is_super_admin = FALSE RETURNING *`,
    [status, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'User not found (or is a super admin).' });
  if (status !== 'active') await query('UPDATE sessions SET active = FALSE WHERE user_id = $1', [req.params.id]);
  res.json({ user: publicUser(rows[0]) });
};

router.post('/:id/lock', authenticate, requireAdmin, setStatus('locked'));
router.post('/:id/block', authenticate, requireAdmin, setStatus('blocked'));
router.post('/:id/unlock', authenticate, requireAdmin, setStatus('active'));
router.post('/:id/unblock', authenticate, requireAdmin, setStatus('active'));

// Profile update (any authenticated user, their own account).
router.put('/me', authenticate, async (req, res) => {
  const { fullName, alStream } = req.body;
  const { rows } = await query(
    `UPDATE users SET full_name = COALESCE($1, full_name), al_stream = COALESCE($2, al_stream)
     WHERE id = $3 RETURNING *`,
    [fullName ?? null, alStream ?? null, req.user.id]
  );
  res.json({ user: publicUser(rows[0]) });
});

// Complete profile (after Google sign-up): the details Google doesn't provide.
//  student    -> full name, A/L stream, Z-score
//  parent     -> full name, relationship, child email(s) (must be existing student accounts)
//  counsellor -> full name
router.put('/me/complete-profile', authenticate, async (req, res) => {
  try {
    const me = req.user;
    const { fullName, alStream, zScore, childEmail1, childEmail2, relationship = 'guardian', counsellorCourseIds } = req.body || {};
    const c1 = (childEmail1 || '').toLowerCase().trim();
    const c2 = (childEmail2 || '').toLowerCase().trim();
    const isStudent = me.role === 'student';
    const isParent = me.role === 'parent';

    const invalid = v.first(
      v.name(fullName),
      isStudent ? (v.required(alStream, 'A/L stream') || (v.AL_STREAMS.includes(alStream) ? '' : 'Choose a valid A/L stream.')) : '',
      isStudent ? v.number(zScore, 'Z-score', { min: 0, max: 4, decimals: 4 }) : '',
      isParent ? v.email(childEmail1, 'Child 1 email') : '',
      isParent && c2 ? v.email(childEmail2, 'Child 2 email') : '',
      isParent && (c1 === me.email || c2 === me.email) ? 'Use your child\'s email, not your own.' : '',
      isParent && c2 && c1 === c2 ? 'Child 2 email must be different from Child 1.' : '',
      isParent && !['mother', 'father', 'guardian'].includes(relationship) ? 'Choose mother, father or guardian.' : '',
      me.role === 'counsellor' ? v.courseIds(counsellorCourseIds) : '',
    );
    if (invalid) return res.status(400).json({ message: invalid });

    if (isParent) {
      const emails = [c1, c2].filter(Boolean);
      const { rows: kids } = await query(
        `SELECT id, email FROM users WHERE lower(email) = ANY($1::text[]) AND role = 'student' AND status = 'active'`,
        [emails]
      );
      const found = new Set(kids.map((k) => k.email.toLowerCase()));
      const missing = emails.filter((e) => !found.has(e));
      if (missing.length) {
        return res.status(400).json({ message: `No active student account found for: ${missing.join(', ')}` });
      }
      for (const kid of kids) {
        await query(
          `INSERT INTO parent_student_links (parent_id, student_id, relationship)
           VALUES ($1, $2, $3)
           ON CONFLICT (parent_id, student_id) DO UPDATE SET relationship = EXCLUDED.relationship`,
          [me.id, kid.id, relationship]
        );
      }
    }

    if (me.role === 'counsellor') {
      try {
        await matching.setCounsellorCourses(me.id, counsellorCourseIds);
      } catch (err) {
        if (err instanceof matching.MatchingError) return res.status(err.status).json({ message: err.message });
        throw err;
      }
    }

    const name = fullName.trim();
    const initialsOf = name.split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
    const { rows } = await query(
      `UPDATE users SET full_name = $1, avatar_initials = $2,
              al_stream = CASE WHEN role = 'student' THEN $3 ELSE al_stream END,
              z_score = CASE WHEN role = 'student' THEN $4::numeric ELSE z_score END,
              profile_completed = TRUE, profile_completion = GREATEST(profile_completion, 80)
       WHERE id = $5 RETURNING *`,
      [name, initialsOf, isStudent ? alStream : null, isStudent ? Number(zScore) : null, me.id]
    );
    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    console.error('complete profile error', err);
    res.status(500).json({ message: 'Could not save your profile.' });
  }
});

// Super admin: reset another admin's authenticator (e.g. lost phone).
// They will be asked to scan a new QR code at their next login.
router.post('/:id/reset-mfa', authenticate, requireAdmin, async (req, res) => {
  if (!req.user.is_super_admin) return res.status(403).json({ message: 'Only a super admin can reset an authenticator.' });
  const { rows } = await query(
    `UPDATE users SET totp_secret = NULL, totp_enabled = FALSE, totp_failed = 0,
            totp_last_step = NULL, totp_locked_until = NULL
     WHERE id = $1 AND role = 'admin' RETURNING *`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Admin not found.' });
  res.json({ user: publicUser(rows[0]) });
});

// Delete own account (any role). Password accounts must confirm with their password;
// Google-only accounts confirm by typing DELETE. The super admin cannot be deleted.
// Related rows are removed or detached by the schema's ON DELETE rules.
router.delete('/me', authenticate, async (req, res) => {
  const { password, confirm } = req.body || {};
  const me = req.user;
  if (me.is_super_admin) {
    return res.status(403).json({ message: 'The super admin account cannot be deleted.' });
  }
  if (me.password_hash) {
    if (!password || !(await bcrypt.compare(password, me.password_hash))) {
      return res.status(401).json({ message: 'Incorrect password. Your account was not deleted.' });
    }
  } else if (confirm !== 'DELETE') {
    return res.status(400).json({ message: 'Type DELETE to confirm.' });
  }
  await query('DELETE FROM users WHERE id = $1', [me.id]);
  res.json({ message: 'Your account has been deleted.' });
});

module.exports = router;
