const { userColumns } = require('../utils/userColumns');
const { verifyToken } = require('../utils/token');
const { query } = require('../config/db');

// Attaches req.user (fresh from DB) when a valid Bearer token is present.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = verifyToken(token);
    const { rows } = await query(`SELECT ${await userColumns()} FROM users WHERE id = $1`, [payload.id]);
    if (!rows.length) return res.status(401).json({ message: 'Account no longer exists.' });

    const user = rows[0];
    if (user.status === 'blocked') return res.status(403).json({ message: 'Account is blocked.' });
    if (user.status === 'locked') return res.status(403).json({ message: 'Account is locked.' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

// Restricts a route to one or more roles. Admins always pass.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (req.user.role === 'admin' || roles.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'You do not have access to this resource.' });
};

// Stricter: admin only (used for CRUD on courses, user management, etc.)
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin' && req.user.admin_approved) return next();
  return res.status(403).json({ message: 'Admin access required.' });
};

module.exports = { authenticate, requireRole, requireAdmin };
