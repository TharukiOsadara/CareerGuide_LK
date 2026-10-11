const ALLOWED_PATHWAYS = [
  'Software Engineering',
  'Biomedical Science',
  'Data Science & AI',
  'Information Technology',
  'Business Management',
  'Marketing',
  'Accounting & Finance',
  'International Relations',
  'Mechanical Engineering',
  'Medicine & Surgery',
];

const MAX_SUMMARY = 4000;

function parseId(raw) {
  if (typeof raw !== 'number' && !/^\d+$/.test(String(raw).trim())) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validateListFilters(query = {}) {
  const fields = {};
  for (const [field, maxLength] of [['search', 100], ['stream', 60]]) {
    if (query[field] === undefined) continue;
    if (typeof query[field] !== 'string') return { error: `${field} must be text` };
    const value = query[field].trim();
    if (value.length > maxLength) return { error: `${field} must be ${maxLength} characters or fewer` };
    fields[field] = value;
  }

  if (query.status !== undefined) {
    if (!['pending', 'reviewed'].includes(String(query.status).toLowerCase())) {
      return { error: 'status must be pending or reviewed' };
    }
    fields.status = String(query.status).toLowerCase();
  }
  if (query.courseId !== undefined && (!/^\d+$/.test(String(query.courseId)) || Number(query.courseId) < 1)) {
    return { error: 'courseId must be a positive integer' };
  }
  for (const field of ['page', 'pageSize']) {
    if (query[field] === undefined) continue;
    if (!/^\d+$/.test(String(query[field])) || Number(query[field]) < 1) {
      return { error: `${field} must be a positive integer` };
    }
  }
  return { value: fields };
}

function validateGuidance(body, { partial = false } = {}) {
  const value = {};
  const input = body || {};

  if (input.assessmentSummary !== undefined) {
    if (typeof input.assessmentSummary !== 'string') {
      return { error: 'assessmentSummary must be text' };
    }
    const summary = input.assessmentSummary.trim();
    if (summary.length > MAX_SUMMARY) {
      return { error: `assessmentSummary must be ${MAX_SUMMARY} characters or fewer` };
    }
    value.assessmentSummary = summary;
  } else if (!partial) {
    value.assessmentSummary = '';
  }

  if (input.recommendedPathways !== undefined) {
    if (!Array.isArray(input.recommendedPathways)) {
      return { error: 'recommendedPathways must be an array' };
    }
    const pathways = [...new Set(input.recommendedPathways)];
    if (pathways.some((pathway) => typeof pathway !== 'string' || !ALLOWED_PATHWAYS.includes(pathway))) {
      return { error: `recommendedPathways must use the supported pathway labels: ${ALLOWED_PATHWAYS.join(', ')}` };
    }
    value.recommendedPathways = pathways;
  } else if (!partial) {
    value.recommendedPathways = [];
  }

  if (input.guidanceStatus !== undefined) {
    if (!['draft', 'final'].includes(input.guidanceStatus)) {
      return { error: 'guidanceStatus must be draft or final' };
    }
    value.guidanceStatus = input.guidanceStatus;
  }

  if (input.sharedWithParent !== undefined) {
    if (typeof input.sharedWithParent !== 'boolean') {
      return { error: 'sharedWithParent must be true or false' };
    }
    value.sharedWithParent = input.sharedWithParent;
  }

  if (partial && Object.keys(value).length === 0) {
    return { error: 'Nothing to update' };
  }
  return { value };
}

function validateSettings(body, { partial = false } = {}) {
  const value = {};
  const input = body || {};
  const textFields = [
    ['schoolAffiliation', 160],
    ['zone', 160],
    ['ugcHandbookVersion', 40],
  ];
  const booleanFields = ['notificationsEnabled', 'emailAlertsEnabled'];

  for (const [field, maxLength] of textFields) {
    if (input[field] === undefined) continue;
    if (input[field] !== null && typeof input[field] !== 'string') {
      return { error: `${field} must be text or null` };
    }
    if (typeof input[field] === 'string' && input[field].trim().length > maxLength) {
      return { error: `${field} is too long` };
    }
    value[field] = typeof input[field] === 'string' ? input[field].trim() : null;
  }

  for (const field of booleanFields) {
    if (input[field] === undefined) continue;
    if (typeof input[field] !== 'boolean') return { error: `${field} must be true or false` };
    value[field] = input[field];
  }

  if (partial && Object.keys(value).length === 0) return { error: 'Nothing to update' };
  return { value };
}

module.exports = {
  ALLOWED_PATHWAYS,
  parseId,
  validateListFilters,
  validateGuidance,
  validateSettings,
};
