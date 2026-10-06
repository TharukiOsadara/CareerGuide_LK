const { Pool } = require('pg');

// Shared connection pool. Expects dotenv to be loaded by the entry file (server.js).
// The database is far away (Neon, us-east-2): every new TLS connection costs ~1s,
// so keep idle connections open for 5 minutes instead of pg's default 10 seconds.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 5 * 60 * 1000,
  keepAlive: true,
});

module.exports = pool;
