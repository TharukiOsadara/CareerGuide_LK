const express = require('express');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin settings (e.g. login notification toggle).
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await query('SELECT * FROM admin_settings WHERE admin_id = $1', [req.user.id]);
  if (!rows.length) {
    await query('INSERT INTO admin_settings (admin_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.user.id]);
    return res.json({ settings: { loginNotifications: true } });
  }
  res.json({ settings: { loginNotifications: rows[0].login_notifications } });
});

router.put('/', authenticate, requireAdmin, async (req, res) => {
  const { loginNotifications } = req.body;
  const { rows } = await query(
    `INSERT INTO admin_settings (admin_id, login_notifications) VALUES ($1, $2)
     ON CONFLICT (admin_id) DO UPDATE SET login_notifications = EXCLUDED.login_notifications
     RETURNING *`,
    [req.user.id, loginNotifications !== false]
  );
  res.json({ settings: { loginNotifications: rows[0].login_notifications } });
});

module.exports = router;
