const express = require('express');
const cors = require('cors');
const parentRoutes = require('./routes/parent.routes');
const counsellorRoutes = require('./routes/counsellor.routes');
const { PORT } = require('./config/env');
const { pool } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/parent', parentRoutes);
app.use('/api/counsellor', counsellorRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'CareerGuide LK API is running' });
});

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'healthy', database: 'connected', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
