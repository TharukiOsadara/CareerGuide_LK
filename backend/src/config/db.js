const { Pool } = require('pg');
// Load .env first so DATABASE_URL is set even when a script (e.g. initDb.js) uses the DB directly.
const { DATABASE_URL } = require('./env');

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

// Keep both import styles working across the controllers and startup scripts.
module.exports = pool;
module.exports.pool = pool;
module.exports.query = pool.query.bind(pool);
