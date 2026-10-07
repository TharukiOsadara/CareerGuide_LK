const pool = require('../db');

const { verifyToken } = require('../utils/token');

// Reads the signed-in user's id from the JWT issued at login (Authorization: Bearer <token>).
// The checks below, and the `req.user` / `req.child` shapes, are unchanged.
function readUserId(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  try {
    const userId = Number(verifyToken(header.slice(7)).id);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}

function rejectUser(res, row) {
  if (!row) {
    res.status(401).json({ error: 'Not signed in', code: 'UNAUTHENTICATED' });
    return true;
  }
  if (row.role !== 'parent') {
    res.status(403).json({ error: 'Parent access only', code: 'FORBIDDEN' });
    return true;
  }
  return false;
}

async function requireParent(req, res, next) {
  const userId = readUserId(req);
  if (!userId) return rejectUser(res, null);

  const { rows } = await pool.query(
    `SELECT id, full_name, role FROM users WHERE id = $1 AND status = 'active'`,
    [userId]
  );
  if (rejectUser(res, rows[0])) return;

  req.user = { id: rows[0].id, role: rows[0].role, fullName: rows[0].full_name };
  next();
}

// Parent check + parent -> child link for :studentId in ONE query (one round trip).
// Unlinked children return 404 so a parent cannot discover whether another student exists (NFR03).
async function requireParentAndChild(req, res, next) {
  const userId = readUserId(req);
  if (!userId) return rejectUser(res, null);

  const studentId = Number(req.params.studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ error: 'Invalid student id', code: 'VALIDATION' });
  }

  const { rows } = await pool.query(
    `SELECT p.id, p.full_name, p.role,
            l.student_id, l.counsellor_id, l.relationship,
            s.full_name AS student_name, s.al_stream, s.z_score, s.avatar_initials,
            c.full_name AS counsellor_name
     FROM users p
     LEFT JOIN parent_student_links l ON l.parent_id = p.id AND l.student_id = $2
     LEFT JOIN users s ON s.id = l.student_id
     LEFT JOIN users c ON c.id = l.counsellor_id
     WHERE p.id = $1 AND p.status = 'active'`,
    [userId, studentId]
  );
  const row = rows[0];
  if (rejectUser(res, row)) return;
  if (!row.student_id) {
    return res.status(404).json({ error: 'Student not found', code: 'NOT_FOUND' });
  }

  req.user = { id: row.id, role: row.role, fullName: row.full_name };
  req.child = {
    student_id: row.student_id,
    counsellor_id: row.counsellor_id,
    relationship: row.relationship,
    student_name: row.student_name,
    al_stream: row.al_stream,
    z_score: row.z_score === null || row.z_score === undefined ? null : Number(row.z_score),
    avatar_initials: row.avatar_initials,
    counsellor_name: row.counsellor_name,
  };
  next();
}

module.exports = { requireParent, requireParentAndChild };
