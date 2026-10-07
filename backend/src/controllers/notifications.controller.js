const express = require('express');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const mapNotif = (n) => ({
  id: n.id,
  title: n.title,
  body: n.body,
  targetRole: n.target_role,
  targetUserId: n.target_user_id,
  senderId: n.sender_id,
  createdAt: n.created_at,
  read: n.read_at != null,
});

// Feed for the current user: notifications targeted to their role, to "all", or to them directly.
router.get('/', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT n.*, r.read_at
       FROM notifications n
       LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = $1
      WHERE n.target_role = 'all'
         OR n.target_role = $2
         OR n.target_user_id = $1
      ORDER BY n.created_at DESC`,
    [req.user.id, req.user.role]
  );
  const items = rows.map(mapNotif);
  res.json({ notifications: items, unread: items.filter((n) => !n.read).length });
});

router.get('/unread-count', authenticate, async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS c
       FROM notifications n
       LEFT JOIN notification_reads r ON r.notification_id = n.id AND r.user_id = $1
      WHERE (n.target_role = 'all' OR n.target_role = $2 OR n.target_user_id = $1)
        AND r.read_at IS NULL`,
    [req.user.id, req.user.role]
  );
  res.json({ unread: rows[0].c });
});

// Mark one (or all) as read for the current user.
router.post('/:id/read', authenticate, async (req, res) => {
  await query(
    `INSERT INTO notification_reads (notification_id, user_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Marked as read.' });
});

router.post('/read-all', authenticate, async (req, res) => {
  await query(
    `INSERT INTO notification_reads (notification_id, user_id)
     SELECT n.id, $1 FROM notifications n
      WHERE (n.target_role = 'all' OR n.target_role = $2 OR n.target_user_id = $1)
     ON CONFLICT DO NOTHING`,
    [req.user.id, req.user.role]
  );
  res.json({ message: 'All marked as read.' });
});

// --- Admin: create / update / delete broadcasts ---
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { title, body, targetRole = 'all', targetUserId = null } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Title and message are required.' });
  const { rows } = await query(
    `INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [title, body, req.user.id, targetRole, targetUserId]
  );
  res.status(201).json({ notification: mapNotif(rows[0]) });
});

// Admin view of everything they've sent.
router.get('/sent', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM notifications ORDER BY created_at DESC'
  );
  res.json({ notifications: rows.map(mapNotif) });
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { title, body, targetRole } = req.body;
  const { rows } = await query(
    `UPDATE notifications SET title = COALESCE($1, title), body = COALESCE($2, body),
       target_role = COALESCE($3, target_role) WHERE id = $4 RETURNING *`,
    [title ?? null, body ?? null, targetRole ?? null, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification: mapNotif(rows[0]) });
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { rowCount } = await query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ message: 'Notification deleted.' });
});

module.exports = router;
