// Shared form validation rules. Each validator returns '' when the value is valid,
// otherwise a message to show under the field. The backend applies the same rules
// (backend/src/utils/validate.js), so keep the two in sync.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
// Names: letters (any script, e.g. Sinhala/Tamil), spaces, dot, apostrophe, hyphen. No digits or symbols.
const NAME_BAD_CHARS = /[0-9!@#$%^&*()_+=[\]{};:"\\|<>/?~`,]/;
const HAS_LETTER = /[A-Za-z\u00C0-\u024F\u0D80-\u0DFF\u0B80-\u0BFF]/;

const isBlank = (v) => v == null || String(v).trim() === '';

export function required(value, label) {
  return isBlank(value) ? `${label} is required.` : '';
}

export function validateName(value, label = 'Full name') {
  if (isBlank(value)) return `${label} is required.`;
  const v = String(value).trim();
  if (/^\d+$/.test(v.replace(/\s/g, ''))) return `${label} cannot be only numbers.`;
  if (NAME_BAD_CHARS.test(v)) return `${label} can only contain letters, spaces, . ' and -.`;
  if (v.replace(/[\s.'-]/g, '').length < 2) return `${label} must be at least 2 letters.`;
  if (v.length > 100) return `${label} must be 100 characters or fewer.`;
  return '';
}

export function validateEmail(value, label = 'Email') {
  if (isBlank(value)) return `${label} is required.`;
  const v = String(value).trim();
  if (!v.includes('@')) return `${label} must contain an @ sign.`;
  if (!EMAIL_RE.test(v)) return `Enter a valid ${label.toLowerCase()} (e.g. name@example.com).`;
  if (v.length > 254) return `${label} is too long.`;
  return '';
}

// Password typed when signing in: only required (older accounts may predate the rules).
export function validateLoginPassword(value) {
  return isBlank(value) ? 'Password is required.' : '';
}

// Password being created or changed.
export function validateNewPassword(value, label = 'Password') {
  if (!value) return `${label} is required.`;
  if (value.length < 8) return `${label} must be at least 8 characters.`;
  if (value.length > 128) return `${label} must be 128 characters or fewer.`;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return `${label} must include letters and at least one number.`;
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return `${label} needs upper and lower case letters and a symbol (e.g. @, #, !).`;
  }
  return '';
}

// Free text such as a degree, university, title or message: required, must contain letters.
export function validateText(value, label, { min = 2, max = 200 } = {}) {
  if (isBlank(value)) return `${label} is required.`;
  const v = String(value).trim();
  if (!HAS_LETTER.test(v)) return `${label} must contain letters, not only numbers or symbols.`;
  if (v.length < min) return `${label} must be at least ${min} characters.`;
  if (v.length > max) return `${label} must be ${max} characters or fewer.`;
  return '';
}

// Numbers typed into text fields. `decimals` limits digits after the point.
export function validateNumber(value, label, { min, max, integer = false, decimals, optional = false } = {}) {
  if (isBlank(value)) return optional ? '' : `${label} is required.`;
  const v = String(value).trim();
  const pattern = integer ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/;
  if (!pattern.test(v)) return integer ? `${label} must be a whole number.` : `${label} must be a number.`;
  if (decimals != null && v.includes('.') && v.split('.')[1].length > decimals) {
    return `${label} can have at most ${decimals} decimal places.`;
  }
  const n = Number(v);
  if (min != null && n < min) return `${label} must be at least ${min}.`;
  if (max != null && n > max) return `${label} must be at most ${max}.`;
  return '';
}

export function validateCode6(value) {
  if (isBlank(value)) return 'The 6-digit code is required.';
  return /^\d{6}$/.test(String(value).replace(/\s/g, '')) ? '' : 'The code must be exactly 6 digits.';
}

// Removes empty entries; returns {} when everything is valid.
export function collectErrors(map) {
  return Object.fromEntries(Object.entries(map).filter(([, msg]) => msg));
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;

// Course / Z-score form (admin). NVQ level is optional: it only applies to vocational programs.
export function validateCourse(f) {
  const thisYear = new Date().getFullYear();
  const errs = {
    degreeName: validateText(f.degreeName, 'Degree name', { min: 3 }),
    uniName: validateText(f.uniName, 'University', { min: 3 }),
    alStream: required(f.alStream, 'A/L stream'),
    zScore: validateNumber(f.zScore, 'Z-score', { min: 0, max: 4, decimals: 4 }),
    minZScore: validateNumber(f.minZScore, 'Min Z-score', { min: 0, max: 4, decimals: 4 }),
    islandRank: validateNumber(f.islandRank, 'Island rank', { min: 1, max: 1000000, integer: true }),
    districtRank: validateNumber(f.districtRank, 'District rank', { min: 1, max: 1000000, integer: true }),
    district: validateName(f.district, 'District'),
    intakeYear: validateNumber(f.intakeYear, 'Intake year', { min: 2000, max: thisYear + 2, integer: true }),
    duration: isBlank(f.duration) ? 'Duration is required.'
      : /^\d+(\.\d+)?\s*(years?|yrs?|months?)$/i.test(String(f.duration).trim()) ? ''
        : 'Duration must look like "4 years" or "18 months".',
    tuitionFee: validateNumber(f.tuitionFee, 'Tuition fee', { min: 0, max: 100000000, decimals: 2 }),
    nvqLevel: validateNumber(f.nvqLevel, 'NVQ level', { min: 1, max: 7, integer: true, optional: true }),
    matchPercent: validateNumber(f.matchPercent, 'Match %', { min: 0, max: 100, integer: true }),
    description: validateText(f.description, 'Description', { min: 10, max: 1000 }),
    careerPath: validateText(f.careerPath, 'Career path', { min: 5, max: 1000 }),
  };
  if (!errs.zScore && !errs.minZScore && Number(f.minZScore) > Number(f.zScore)) {
    errs.minZScore = 'Min Z-score cannot be higher than the Z-score.';
  }
  if (!errs.islandRank && !errs.districtRank && Number(f.districtRank) > Number(f.islandRank)) {
    errs.districtRank = 'District rank cannot be higher than the island rank.';
  }
  return collectErrors(errs);
}

// Admin notification form.
export function validateNotification({ title, body, audience }) {
  return collectErrors({
    title: validateText(title, 'Title', { min: 3, max: 120 }),
    body: validateText(body, 'Message', { min: 10, max: 1000 }),
    audience: required(audience, 'Target audience'),
  });
}
