const { Pool } = require('pg');
const { DATABASE_URL } = require('./env');

// Neon requires SSL. The pooled connection string already carries sslmode=require,
// but we pass ssl explicitly so local Node doesn't reject the Neon certificate.
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
