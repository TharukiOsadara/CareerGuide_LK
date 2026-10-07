const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { publicUser } = require('../utils/token');

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
