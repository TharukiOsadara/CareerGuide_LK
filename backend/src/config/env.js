// Load the backend environment regardless of the process working directory.
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: (process.env.DATABASE_URL || '').trim(),
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  // ngrok tunnel (free account): gives this backend a public https address for Google sign-in.
  NGROK_AUTHTOKEN: (process.env.NGROK_AUTHTOKEN || '').trim(),
  NGROK_DOMAIN: (process.env.NGROK_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, ''),
  // Public https address of this backend. Google redirects here after sign-in.
  // Defaults to the ngrok domain when one is set.
  PUBLIC_URL: ((process.env.PUBLIC_URL || '').trim()
    || (process.env.NGROK_DOMAIN ? `https://${process.env.NGROK_DOMAIN.trim().replace(/^https?:\/\//, '')}` : ''))
    .replace(/\/+$/, ''),
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'admin@careerguide.lk',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'Admin@1234',
};
