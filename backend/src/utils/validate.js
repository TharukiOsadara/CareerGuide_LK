// Server-side copies of the app's form rules (frontend/src/utils/validation.js).
// Every validator returns '' when valid, otherwise a user-facing message.
// The API never trusts the app's checks alone: each create/update route calls these.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const NAME_BAD_CHARS = /[0-9!@#$%^&*()_+=[\]{};:"\\|<>/?~`,]/;
const HAS_LETTER = /[A-Za-z\u00C0-\u024F\u0D80-\u0DFF\u0B80-\u0BFF]/;
const AL_STREAMS = [
  'Physical Science (Maths)', 'Biological Science', 'Commerce', 'Arts',
  'Technology', 'Engineering Technology', 'Bio Systems Technology',
];

const isBlank = (v) => v == null || String(v).trim() === '';

const required = (v, label) => (isBlank(v) ? `${label} is required.` : '');

function name(v, label = 'Full name') {
  if (isBlank(v)) return `${label} is required.`;
  const s = String(v).trim();
  if (/^\d+$/.test(s.replace(/\s/g, ''))) return `${label} cannot be only numbers.`;
  if (NAME_BAD_CHARS.test(s)) return `${label} can only contain letters, spaces, . ' and -.`;
  if (s.replace(/[\s.'-]/g, '').length < 2) return `${label} must be at least 2 letters.`;
  if (s.length > 100) return `${label} must be 100 characters or fewer.`;
  return '';
}

function email(v, label = 'Email') {
  if (isBlank(v)) return `${label} is required.`;
  const s = String(v).trim();
  if (!s.includes('@')) return `${label} must contain an @ sign.`;
  if (!EMAIL_RE.test(s) || s.length > 254) return `Enter a valid ${label.toLowerCase()}.`;
  return '';
}

function newPassword(v, label = 'Password') {
  if (!v || typeof v !== 'string') return `${label} is required.`;
  if (v.length < 8) return `${label} must be at least 8 characters.`;
  if (v.length > 128) return `${label} must be 128 characters or fewer.`;
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return `${label} must include letters and at least one number.`;
  if (!/[A-Z]/.test(v) || !/[a-z]/.test(v) || !/[^A-Za-z0-9]/.test(v)) {
    return `${label} needs upper and lower case letters and a symbol.`;
  }
  return '';
}

function text(v, label, { min = 2, max = 200 } = {}) {
  if (isBlank(v)) return `${label} is required.`;
  const s = String(v).trim();
  if (!HAS_LETTER.test(s)) return `${label} must contain letters, not only numbers or symbols.`;
  if (s.length < min) return `${label} must be at least ${min} characters.`;
  if (s.length > max) return `${label} must be ${max} characters or fewer.`;
  return '';
}

function number(v, label, { min, max, integer = false, decimals, optional = false } = {}) {
  if (isBlank(v)) return optional ? '' : `${label} is required.`;
  const s = String(v).trim();
  if (!(integer ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/).test(s)) {
    return integer ? `${label} must be a whole number.` : `${label} must be a number.`;
  }
  if (decimals != null && s.includes('.') && s.split('.')[1].length > decimals) {
    return `${label} can have at most ${decimals} decimal places.`;
  }
  const n = Number(s);
  if (min != null && n < min) return `${label} must be at least ${min}.`;
  if (max != null && n > max) return `${label} must be at most ${max}.`;
  return '';
}

function course(b) {
  const thisYear = new Date().getFullYear();
  const errs = [
    text(b.degreeName, 'Degree name', { min: 3 }),
    text(b.uniName, 'University', { min: 3 }),
    required(b.alStream, 'A/L stream') || (AL_STREAMS.includes(b.alStream) ? '' : 'Choose a valid A/L stream.'),
    number(b.zScore, 'Z-score', { min: 0, max: 4, decimals: 4 }),
    number(b.minZScore, 'Min Z-score', { min: 0, max: 4, decimals: 4 }),
    number(b.islandRank, 'Island rank', { min: 1, max: 1000000, integer: true }),
    number(b.districtRank, 'District rank', { min: 1, max: 1000000, integer: true }),
    name(b.district, 'District'),
    number(b.intakeYear, 'Intake year', { min: 2000, max: thisYear + 2, integer: true }),
    isBlank(b.duration) ? 'Duration is required.'
      : /^\d+(\.\d+)?\s*(years?|yrs?|months?)$/i.test(String(b.duration).trim()) ? '' : 'Duration must look like "4 years".',
    number(b.tuitionFee, 'Tuition fee', { min: 0, max: 100000000, decimals: 2 }),
    number(b.nvqLevel, 'NVQ level', { min: 1, max: 7, integer: true, optional: true }),
    number(b.matchPercent, 'Match %', { min: 0, max: 100, integer: true }),
    text(b.description, 'Description', { min: 10, max: 1000 }),
    text(b.careerPath, 'Career path', { min: 5, max: 1000 }),
  ];
  const first = errs.find(Boolean);
  if (first) return first;
  if (Number(b.minZScore) > Number(b.zScore)) return 'Min Z-score cannot be higher than the Z-score.';
  if (Number(b.districtRank) > Number(b.islandRank)) return 'District rank cannot be higher than the island rank.';
  return '';
}

function notification({ title, body, targetRole }) {
  return text(title, 'Title', { min: 3, max: 120 })
    || text(body, 'Message', { min: 10, max: 1000 })
    || (['student', 'parent', 'counsellor', 'admin', 'all'].includes(targetRole || 'all') ? '' : 'Choose a valid audience.');
}

// Courses a counsellor guides: at least one valid course id.
function courseIds(ids, label = 'Courses you guide') {
  if (!Array.isArray(ids) || ids.length === 0) return `${label}: choose at least one course.`;
  if (ids.length > 20) return `${label}: choose 20 courses or fewer.`;
  if (!ids.every((id) => Number.isInteger(Number(id)) && Number(id) > 0)) return `${label}: invalid course.`;
  return '';
}

// First non-empty message from a list of checks, or ''.
const first = (...msgs) => msgs.find(Boolean) || '';

module.exports = { required, name, email, newPassword, text, number, course, notification, courseIds, first, AL_STREAMS };
