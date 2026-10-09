const { PUBLIC_URL } = require('./env');

// Values only known once the server is running. The public https address comes from
// PUBLIC_URL / NGROK_DOMAIN in .env, or from the ngrok tunnel when it starts.
let publicUrl = PUBLIC_URL;

module.exports = {
  getPublicUrl: () => publicUrl,
  setPublicUrl: (url) => { publicUrl = String(url || '').replace(/\/+$/, ''); },
};
