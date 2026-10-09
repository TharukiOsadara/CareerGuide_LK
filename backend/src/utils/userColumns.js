const { query } = require('../config/db');

// Every users column except profile_picture. Pictures are stored inline (base64, can be
// hundreds of KB), so `SELECT *` on users made the admin user list and every authenticated
// request for those accounts slow. Only the student profile endpoint reads the picture.
let cached = null;

async function userColumns(alias = '') {
  if (!cached) {
    const { rows } = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'users' AND column_name <> 'profile_picture'
       ORDER BY ordinal_position`
    );
    cached = rows.map((r) => `"${r.column_name}"`);
  }
  return alias ? cached.map((c) => `${alias}.${c}`).join(', ') : cached.join(', ');
}

module.exports = { userColumns };
