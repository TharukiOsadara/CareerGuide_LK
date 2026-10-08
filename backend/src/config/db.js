const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
