const { PORT, NODE_ENV } = require('./config/env');
const express = require('express');
const cors = require('cors');
const studentRoutes = require('./routes/studentRoutes');
const parentRoutes = require('./routes/parent.routes');
const counsellorRoutes = require('./routes/counsellor.routes');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const logRoutes = require('./routes/logs');
const settingsRoutes = require('./routes/settings');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.get('/', (req, res) => res.json({ message: 'CareerGuide LK API is running', env: NODE_ENV }));

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'healthy', database: 'connected', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

app.use('/api', studentRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/counsellor', counsellorRoutes);

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => console.log(`CareerGuide LK API running on port ${PORT}`));
