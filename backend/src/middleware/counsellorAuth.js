const pool = require('../db');
const { parseId } = require('../validators/counsellor.validators');

// Temporary auth shared with the rest of the project. Replace only readUserId
// with JWT verification when the team's sign-in work is ready.
function readUserId(req) {
  return parseId(req.get('x-user-id'));
}

async function requireCounsellor(req, res, next) {
  if (req.user) {
    if (req.user.role !== 'counsellor' || req.user.status !== 'active') {
      return res.status(403).json({ error: 'Counsellor access only', code: 'FORBIDDEN' });
    }
    req.user = {
      id: req.user.id,
      role: req.user.role,
      isSenior: req.user.is_senior === true,
      fullName: req.user.full_name || req.user.fullName,
    };
    return next();
  }

  const userId = readUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not signed in', code: 'UNAUTHENTICATED' });
  }

  const { rows } = await pool.query(
    `SELECT id, full_name, role, is_senior
     FROM users
     WHERE id = $1 AND role = 'counsellor' AND status = 'active'`,
    [userId]
  );

  if (!rows[0]) {
    return res.status(403).json({ error: 'Counsellor access only', code: 'FORBIDDEN' });
  }

  req.user = {
    id: rows[0].id,
    role: rows[0].role,
    fullName: rows[0].full_name,
    isSenior: rows[0].is_senior === true,
  };
  next();
}

module.exports = { requireCounsellor };
