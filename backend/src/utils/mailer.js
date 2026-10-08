const nodemailer = require('nodemailer');

// Sends email through SMTP when it is configured in backend/.env:
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=you@gmail.com  SMTP_PASS=<16-char app password>
//   MAIL_FROM="CareerGuide LK <you@gmail.com>"   (optional)
// Without SMTP settings (local development) the message is printed to this server's
// console instead, so the person running the backend can read it. It is never sent
// back to the app.
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  const port = Number(SMTP_PORT) || 465;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const isConfigured = () => Boolean(transporter);

async function sendMail({ to, subject, text }) {
  if (!transporter) {
    const code = (text.match(/\b\d{6}\b/) || [])[0];
    console.log(`\n===== EMAIL (SMTP not configured - printed instead of sent) =====\nTo: ${to}\nSubject: ${subject}\n\n${text}\n=================================================================\n`);
    if (code) console.log(`>>>>>>>>>>  RESET CODE for ${to}:  ${code}  <<<<<<<<<<\n`);
    return { delivered: false };
  }
  await transporter.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject, text });
  return { delivered: true };
}

module.exports = { sendMail, isConfigured };
