require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const parentRoutes = require('./routes/parent.routes');
const counsellorRoutes = require('./routes/counsellor.routes');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/parent', parentRoutes);
app.use('/api/counsellor', counsellorRoutes);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/', (req, res) => {
  res.json({ message: 'CareerGuide LK API is running' });
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'healthy', database: 'connected', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

app.use((error, req, res, next) => {
  console.error('[api]', error);
  if (res.headersSent) return next(error);
  res.status(error.statusCode || 500).json({
    error: error.statusCode ? error.message : 'Something went wrong. Please try again.',
    code: error.code || 'SERVER_ERROR',
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
