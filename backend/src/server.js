const { PORT, NODE_ENV, NGROK_AUTHTOKEN, NGROK_DOMAIN, PUBLIC_URL, GOOGLE_CLIENT_ID } = require('./config/env');
const { setPublicUrl } = require('./config/runtime');
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
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API data is per-user and changes often: never let phones reuse a cached / 304 (empty) reply.
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
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

// Student feature API (profile, academic profile, course catalogue, inquiries).
// Mounted under /api/student so it doesn't shadow /api/courses and /api/notifications.
app.use('/api/student', studentRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/counsellor', counsellorRoutes);
app.use('/api/admin', adminRoutes);

// Unknown address: say which one, so a wrong path in the app is easy to spot.
app.use((req, res) => {
  console.warn(`404 Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, async () => {
  console.log(`CareerGuide LK API running on port ${PORT}`);
  // Public https tunnel for Google sign-in (only when an ngrok token is configured).
  if (NGROK_AUTHTOKEN) {
    try {
      const ngrok = require('@ngrok/ngrok');
      const listener = await ngrok.forward({
        addr: Number(PORT),
        authtoken: NGROK_AUTHTOKEN,
        ...(NGROK_DOMAIN ? { domain: NGROK_DOMAIN } : {}),
      });
      const url = listener.url();
      console.log(`Public URL (ngrok): ${url}`);
      if (PUBLIC_URL && url !== PUBLIC_URL) {
        console.warn(`Note: using the ngrok address ${url} instead of ${PUBLIC_URL}.`);
      }
      setPublicUrl(url);
      if (GOOGLE_CLIENT_ID) {
        console.log(`Google sign-in redirect URI (add this in Google Cloud -> your Web client):
  ${url}/api/auth/google/callback`);
      }
    } catch (err) {
      console.error('ngrok tunnel failed:', err.message);
    }
  }
});
