const express = require('express');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Dashboard stats for the audit log screen.
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  const active = await query('SELECT COUNT(*)::int AS c FROM sessions WHERE active = TRUE');
  const today = await query(
    `SELECT COUNT(*)::int AS c FROM access_logs WHERE action = 'login' AND created_at::date = NOW()::date`
  );
  const failed = await query(
    `SELECT COUNT(*)::int AS c FROM access_logs WHERE action = 'failed_login' AND created_at::date = NOW()::date`
  );
  const locked = await query(`SELECT COUNT(*)::int AS c FROM users WHERE status IN ('locked','blocked')`);
  res.json({
    activeSessions: active.rows[0].c,
    todayLogins: today.rows[0].c,
    failedAttempts: failed.rows[0].c,
    lockedAccounts: locked.rows[0].c,
  });
});

// Live active sessions.
router.get('/sessions', authenticate, requireAdmin, async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, u.status AS user_status FROM sessions s
       LEFT JOIN users u ON u.id = s.user_id
      WHERE s.active = TRUE ORDER BY s.started_at DESC`
  );
  res.json({
    sessions: rows.map((s) => ({
      id: s.id, userId: s.user_id, userName: s.user_name, role: s.role,
      ip: s.ip_address, device: s.device, startedAt: s.started_at,
    })),
  });
});

// Kill a session.
router.post('/sessions/:id/kill', authenticate, requireAdmin, async (req, res) => {
  await query('UPDATE sessions SET active = FALSE WHERE id = $1', [req.params.id]);
  res.json({ message: 'Session terminated.' });
});

// Security alerts for the audit screen:
//  - failedAttempts: accounts with 3+ failed logins in the last 24h (possible brute force)
//  - unusualLogins: successful logins in the last 24h from an IP that account never used before
router.get('/alerts', authenticate, requireAdmin, async (req, res) => {
  const failed = await query(
    `SELECT l.user_id, COALESCE(u.email, l.user_name) AS account, u.full_name, u.status,
            u.is_super_admin, COUNT(*)::int AS attempts, MAX(l.created_at) AS last_at
       FROM access_logs l
       LEFT JOIN users u ON u.id = l.user_id
      WHERE l.action = 'failed_login' AND l.created_at > NOW() - INTERVAL '24 hours'
      GROUP BY l.user_id, COALESCE(u.email, l.user_name), u.full_name, u.status, u.is_super_admin
     HAVING COUNT(*) >= 3
      ORDER BY attempts DESC
      LIMIT 10`
  );
  const unusual = await query(
    `SELECT l.id, l.user_id, l.user_name, l.ip_address, l.created_at,
            (SELECT p.ip_address FROM access_logs p
              WHERE p.user_id = l.user_id AND p.action = 'login' AND p.created_at < l.created_at
              GROUP BY p.ip_address ORDER BY COUNT(*) DESC LIMIT 1) AS usual_ip
       FROM access_logs l
      WHERE l.action = 'login' AND l.user_id IS NOT NULL
        AND l.created_at > NOW() - INTERVAL '24 hours'
        AND EXISTS (SELECT 1 FROM access_logs p
                     WHERE p.user_id = l.user_id AND p.action = 'login' AND p.created_at < l.created_at)
        AND NOT EXISTS (SELECT 1 FROM access_logs p
                         WHERE p.user_id = l.user_id AND p.action = 'login'
                           AND p.created_at < l.created_at AND p.ip_address = l.ip_address)
      ORDER BY l.created_at DESC
      LIMIT 5`
  );
  res.json({
    failedAttempts: failed.rows.map((r) => ({
      userId: r.user_id, account: r.account, fullName: r.full_name, status: r.status,
      canLock: Boolean(r.user_id) && !r.is_super_admin && r.status === 'active',
      attempts: r.attempts, lastAt: r.last_at,
    })),
    unusualLogins: unusual.rows.map((r) => ({
      id: r.id, userId: r.user_id, userName: r.user_name, ip: r.ip_address,
      usualIp: r.usual_ip, createdAt: r.created_at,
    })),
  });
});

// Login history timeline. Optional ?action=&role=&q=
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { action, role, q } = req.query;
  const clauses = [];
  const params = [];
  if (action) { params.push(action); clauses.push(`action = $${params.length}`); }
  if (role) { params.push(role); clauses.push(`role = $${params.length}`); }
  if (q) { params.push(`%${q}%`); clauses.push(`(user_name ILIKE $${params.length} OR ip_address ILIKE $${params.length})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM access_logs ${where} ORDER BY created_at DESC LIMIT 200`, params);
  res.json({
    logs: rows.map((l) => ({
      id: l.id, userName: l.user_name, role: l.role, action: l.action,
      ip: l.ip_address, device: l.device, createdAt: l.created_at,
    })),
  });
});

module.exports = router;
