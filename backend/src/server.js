require('dotenv').config();
const express = require('express');
const cors = require('cors');
const parentRoutes = require('./routes/parent.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/parent', parentRoutes);

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
