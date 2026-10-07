// Emergency reset of an admin's authenticator (e.g. the super admin lost their phone).
// Run on the server:  node backend/src/resetAdminMfa.js admin@careerguide.lk
// The admin will be asked to scan a new QR code at their next login.
const { pool } = require('./config/db');

async function run() {
  const email = (process.argv[2] || '').toLowerCase().trim();
  if (!email) {
    console.error('Usage: node backend/src/resetAdminMfa.js <admin-email>');
    process.exit(1);
  }
  const { rowCount } = await pool.query(
    `UPDATE users SET totp_secret = NULL, totp_enabled = FALSE, totp_failed = 0,
            totp_last_step = NULL, totp_locked_until = NULL
     WHERE email = $1 AND role = 'admin'`,
    [email]
  );
  console.log(rowCount ? `Authenticator reset for ${email}.` : `No admin found with email ${email}.`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
