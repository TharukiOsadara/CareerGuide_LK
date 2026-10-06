const INQUIRY_TOPICS = ['fees', 'intake_dates', 'course_choice', 'other'];
const PRIVACY_FIELDS = ['counsellorAccess', 'parentMonitoring', 'researchShare'];
const MAX_MESSAGE = 1000;

// Each validator returns { value } on success or { error } with a user-facing message.

function validateInquiry(body, { partial = false } = {}) {
  const value = {};
  const { topic, message } = body || {};

  if (topic !== undefined) {
    if (!INQUIRY_TOPICS.includes(topic)) {
      return { error: `topic must be one of: ${INQUIRY_TOPICS.join(', ')}` };
    }
    value.topic = topic;
  } else if (!partial) {
    value.topic = 'other';
  }

  if (message !== undefined) {
    if (typeof message !== 'string' || !message.trim()) {
      return { error: 'Please type your question' };
    }
    if (message.trim().length > MAX_MESSAGE) {
      return { error: `Message must be ${MAX_MESSAGE} characters or fewer` };
    }
    value.message = message.trim();
  } else if (!partial) {
    return { error: 'Please type your question' };
  }

  if (partial && Object.keys(value).length === 0) {
    return { error: 'Nothing to update' };
  }
  return { value };
}

function validatePrivacy(body, { partial = false } = {}) {
  const value = {};
  for (const field of PRIVACY_FIELDS) {
    const v = body?.[field];
    if (v === undefined) continue;
    if (typeof v !== 'boolean') {
      return { error: `${field} must be true or false` };
    }
    value[field] = v;
  }
  if (partial && Object.keys(value).length === 0) {
    return { error: 'Nothing to update' };
  }
  return { value };
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validateInquiry, validatePrivacy, parseId, INQUIRY_TOPICS, MAX_MESSAGE };
