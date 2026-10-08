require('dotenv').config();
const express = require('express');
const cors = require('cors');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// PostgreSQL connection
// Test route
app.get('/', (req, res) => {
  res.json({ message: 'CareerGuide LK API is running' });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const db = require('./config/db');
    const result = await db.query('SELECT NOW()');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      time: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

app.use('/api', studentRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
