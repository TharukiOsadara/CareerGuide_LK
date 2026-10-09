const pool = require('../db');
const { validateInquiry, validatePrivacy, parseId } = require('../validators/parent.validators');
const { getQuizResults, getCounsellorNote } = require('../services/studentResults');

const DISCLAIMER = 'These matches support, not replace, your counsellor\'s advice.';

// Used when a parent has no privacy row yet (never saved, or consent withdrawn):
// nothing is shared with anyone, but the parent can still see their own child.
const NO_CONSENT_PRIVACY = { counsellorAccess: false, parentMonitoring: true, researchShare: false };

// Performance: the database is remote (~300-700 ms per round trip), so
// - independent reads run in parallel with Promise.all, and
// - every write and its audit-log row are ONE statement (data-modifying CTE),
//   which is atomic on its own and needs no BEGIN/COMMIT round trips.

// ---------- helpers ----------

function toChild(row) {
  return {
    studentId: row.student_id,
    fullName: row.student_name,
    initials: row.avatar_initials || initialsOf(row.student_name),
    alStream: row.al_stream,
    zScore: row.z_score,
    relationship: row.relationship,
    counsellor: row.counsellor_id ? { id: row.counsellor_id, name: row.counsellor_name } : null,
  };
}

function initialsOf(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function toInquiry(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    topic: row.topic,
    message: row.message,
    status: row.status,
    reply: row.reply,
    repliedAt: row.replied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canEdit: row.status === 'sent',
  };
}

function toPrivacy(row) {
  return {
    counsellorAccess: row.counsellor_access,
    parentMonitoring: row.parent_monitoring,
    researchShare: row.research_share,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const noConsent = () => ({ ...NO_CONSENT_PRIVACY, createdAt: null, updatedAt: null });

async function findPrivacy(parentId, studentId) {
  const { rows } = await pool.query(
    'SELECT * FROM privacy_preferences WHERE parent_id = $1 AND student_id = $2',
    [parentId, studentId]
  );
  return rows[0] || null;
}

async function effectivePrivacy(parentId, studentId) {
  const row = await findPrivacy(parentId, studentId);
  return row ? toPrivacy(row) : noConsent();
}

function monitoringOff(res) {
  return res.status(403).json({
    error: 'Progress viewing is turned off in Privacy settings',
    code: 'MONITORING_OFF',
  });
}

async function fetchCourses(alStream) {
  if (!alStream) return [];
  const { rows } = await pool.query(
    `SELECT id, degree_name, uni_name, min_z_score, district, duration, tuition_fee,
            ugc_approved, nvq_level, match_percent, career_path, updated_at
     FROM courses
     -- Loose match: ignores case, punctuation and the word "stream", so
     -- "Physical Science (Maths Stream)" matches "Physical Science (Maths)".
     WHERE regexp_replace(regexp_replace(lower(al_stream), 'stream', '', 'g'), '[^a-z]', '', 'g')
         = regexp_replace(regexp_replace(lower($1), 'stream', '', 'g'), '[^a-z]', '', 'g')
     ORDER BY match_percent DESC NULLS LAST, min_z_score DESC
     LIMIT 10`,
    [alStream]
  );
  return rows;
}

function toCourse(c, studentZ) {
  const minZ = c.min_z_score === null ? null : Number(c.min_z_score);
  return {
    id: c.id,
    degreeName: c.degree_name,
    university: c.uni_name,
    minZScore: minZ,
    // UI-03: always say which cut-off this is.
    cutOffLabel: c.district ? `${c.district} District cut-off` : 'Island-wide cut-off',
    meetsCutOff: minZ !== null && studentZ !== null ? studentZ >= minZ : null,
    duration: c.duration,
    tuitionFee: c.tuition_fee,
    ugcApproved: c.ugc_approved,
    nvqLevel: c.nvq_level,
    matchPercent: c.match_percent,
    careerPath: c.career_path,
    demand: null, // FR03: no demand data in the courses table yet
    // FR02: source and last-updated on every data point.
    source: c.ugc_approved ? 'UGC Handbook 2026/2027' : 'Institution prospectus',
    lastUpdated: c.updated_at,
  };
}

async function buildProgress(child) {
  const [quiz, courseRows] = await Promise.all([
    getQuizResults(child.student_id),
    fetchCourses(child.al_stream),
  ]);
  // The student's own Z-score (entered at sign-up) is the real figure; fall back to the quiz data.
  const zScore = child.z_score ?? quiz.zScore ?? null;
  return {
    child: toChild(child),
    assessment: {
      status: quiz.status,
      completedAt: quiz.completedAt,
      zScore,
      district: quiz.district,
      scores: quiz.scores,
      source: quiz.source,
    },
    matchedCareers: quiz.matchedCareers,
    matchedCourses: courseRows.map((c) => toCourse(c, zScore)),
    disclaimer: DISCLAIMER,
  };
}

// ---------- children & read-only views ----------

async function listChildren(req, res) {
  const { rows } = await pool.query(
    `SELECT l.student_id, l.counsellor_id, l.relationship,
            s.full_name AS student_name, s.al_stream, s.z_score, s.avatar_initials,
            c.full_name AS counsellor_name
     FROM parent_student_links l
     JOIN users s ON s.id = l.student_id
     LEFT JOIN users c ON c.id = l.counsellor_id
     WHERE l.parent_id = $1
     ORDER BY s.full_name`,
    [req.user.id]
  );
  res.json({ children: rows.map(toChild) });
}

async function getDashboard(req, res) {
  const { child, user } = req;
  // Progress is computed alongside the privacy check and dropped if monitoring is off.
  const [privacy, note, countsResult, progress] = await Promise.all([
    effectivePrivacy(user.id, child.student_id),
    getCounsellorNote(child.student_id, user.id),
    pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status <> 'answered')::int AS awaiting_reply,
              COUNT(*) FILTER (WHERE status = 'answered')::int AS answered
       FROM counsellor_inquiries WHERE parent_id = $1 AND student_id = $2`,
      [user.id, child.student_id]
    ),
    buildProgress(child),
  ]);
  const counts = countsResult.rows[0];
  const allowed = privacy.parentMonitoring;

  res.json({
    child: toChild(child),
    monitoringOff: !allowed,
    assessment: allowed
      ? {
          status: progress.assessment.status,
          completedAt: progress.assessment.completedAt,
          zScore: progress.assessment.zScore,
          district: progress.assessment.district,
        }
      : null,
    topMatches: allowed ? progress.matchedCareers.slice(0, 2) : [],
    coursesMatched: allowed ? progress.matchedCourses.length : 0,
    counsellor: {
      name: child.counsellor_name || null,
      summary: note?.summary || null,
      recommendedPathways: note?.recommendedPathways || [],
      lastReviewedAt: note?.lastReviewedAt || null,
    },
    inquiries: { total: counts.total, awaitingReply: counts.awaiting_reply, answered: counts.answered },
    privacy,
  });
}

async function getProgress(req, res) {
  const [privacy, progress] = await Promise.all([
    effectivePrivacy(req.user.id, req.child.student_id),
    buildProgress(req.child),
  ]);
  if (!privacy.parentMonitoring) return monitoringOff(res);
  res.json(progress);
}

async function getGuidance(req, res) {
  const note = await getCounsellorNote(req.child.student_id, req.user.id);
  res.json({
    counsellor: req.child.counsellor_id
      ? { id: req.child.counsellor_id, name: req.child.counsellor_name }
      : null,
    note,
  });
}

// Data for the PDF report; the PDF itself is generated on the device.
async function getReport(req, res) {
  const { child, user } = req;
  const [privacy, progress, note] = await Promise.all([
    effectivePrivacy(user.id, child.student_id),
    buildProgress(child),
    getCounsellorNote(child.student_id, user.id),
  ]);
  if (!privacy.parentMonitoring) return monitoringOff(res);

  await pool.query(
    `INSERT INTO parent_data_access_logs (parent_id, student_id, action)
     VALUES ($1, $2, 'report_downloaded')`,
    [user.id, child.student_id]
  );

  res.json({
    ...progress,
    counsellorNote: note,
    preparedFor: user.fullName,
    generatedAt: new Date().toISOString(),
  });
}

async function listAccessLogs(req, res) {
  const { rows } = await pool.query(
    `SELECT id, action, details, created_at FROM parent_data_access_logs
     WHERE parent_id = $1 AND student_id = $2
     ORDER BY created_at DESC LIMIT 50`,
    [req.user.id, req.child.student_id]
  );
  res.json({
    logs: rows.map((r) => ({ id: r.id, action: r.action, details: r.details, createdAt: r.created_at })),
  });
}

// ---------- CRUD 1: counsellor inquiries ----------

async function listInquiries(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM counsellor_inquiries
     WHERE parent_id = $1 AND student_id = $2
     ORDER BY created_at DESC`,
    [req.user.id, req.child.student_id]
  );
  res.json({ inquiries: rows.map(toInquiry) });
}

async function createInquiry(req, res) {
  const { value, error } = validateInquiry(req.body);
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });

  const { child, user } = req;
  const { rows } = await pool.query(
    `WITH ins AS (
       INSERT INTO counsellor_inquiries (parent_id, student_id, counsellor_id, topic, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *
     ), log AS (
       INSERT INTO parent_data_access_logs (parent_id, student_id, action, details)
       SELECT parent_id, student_id, 'inquiry_created', jsonb_build_object('inquiryId', id) FROM ins
     )
     SELECT * FROM ins`,
    [user.id, child.student_id, child.counsellor_id, value.topic, value.message]
  );

  res.status(201).json({
    inquiry: toInquiry(rows[0]),
    message: child.counsellor_name
      ? `${child.counsellor_name} has been notified and will reply via the Parent Portal.`
      : 'Your inquiry was sent and will be answered via the Parent Portal.',
  });
}

// Update/delete share one rule: only the owner, only while status = 'sent'.
// `cur` tells us whether the inquiry exists for this parent; `changed` is empty
// when it exists but was already read/answered.
function inquiryChangeResult(res, rows) {
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: 'Inquiry not found', code: 'NOT_FOUND' });
    return null;
  }
  if (row.id === null) {
    res.status(409).json({
      error: 'The counsellor has already read this inquiry, so it can no longer be changed',
      code: 'INQUIRY_LOCKED',
    });
    return null;
  }
  return row;
}

async function updateInquiry(req, res) {
  const inquiryId = parseId(req.params.inquiryId);
  if (!inquiryId) return res.status(400).json({ error: 'Invalid inquiry id', code: 'VALIDATION' });
  const { value, error } = validateInquiry(req.body, { partial: true });
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });

  const { rows } = await pool.query(
    `WITH cur AS (
       SELECT id FROM counsellor_inquiries WHERE id = $1 AND parent_id = $2
     ), changed AS (
       UPDATE counsellor_inquiries
       SET topic = COALESCE($3, topic), message = COALESCE($4, message), updated_at = NOW()
       WHERE id = $1 AND parent_id = $2 AND status = 'sent'
       RETURNING *
     ), log AS (
       INSERT INTO parent_data_access_logs (parent_id, student_id, action, details)
       SELECT parent_id, student_id, 'inquiry_updated', jsonb_build_object('inquiryId', id) FROM changed
     )
     SELECT changed.* FROM cur LEFT JOIN changed ON TRUE`,
    [inquiryId, req.user.id, value.topic ?? null, value.message ?? null]
  );

  const updated = inquiryChangeResult(res, rows);
  if (updated) res.json({ inquiry: toInquiry(updated) });
}

async function deleteInquiry(req, res) {
  const inquiryId = parseId(req.params.inquiryId);
  if (!inquiryId) return res.status(400).json({ error: 'Invalid inquiry id', code: 'VALIDATION' });

  const { rows } = await pool.query(
    `WITH cur AS (
       SELECT id FROM counsellor_inquiries WHERE id = $1 AND parent_id = $2
     ), changed AS (
       DELETE FROM counsellor_inquiries
       WHERE id = $1 AND parent_id = $2 AND status = 'sent'
       RETURNING *
     ), log AS (
       INSERT INTO parent_data_access_logs (parent_id, student_id, action, details)
       SELECT parent_id, student_id, 'inquiry_deleted', jsonb_build_object('inquiryId', id) FROM changed
     )
     SELECT changed.id FROM cur LEFT JOIN changed ON TRUE`,
    [inquiryId, req.user.id]
  );

  if (inquiryChangeResult(res, rows)) res.json({ deleted: true, id: inquiryId });
}

// ---------- CRUD 2: privacy & data-sharing preferences ----------

const PRIVACY_LOG_DETAILS = `jsonb_build_object('counsellorAccess', counsellor_access,
  'parentMonitoring', parent_monitoring, 'researchShare', research_share)`;

async function getPrivacy(req, res) {
  const row = await findPrivacy(req.user.id, req.child.student_id);
  res.json({ exists: Boolean(row), preferences: row ? toPrivacy(row) : noConsent() });
}

async function createPrivacy(req, res) {
  const { value, error } = validatePrivacy(req.body);
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });

  // Unset fields fall back to safe defaults (research_share = false).
  const { rows } = await pool.query(
    `WITH ins AS (
       INSERT INTO privacy_preferences (parent_id, student_id, counsellor_access, parent_monitoring, research_share)
       VALUES ($1, $2, COALESCE($3, TRUE), COALESCE($4, TRUE), COALESCE($5, FALSE))
       ON CONFLICT (parent_id, student_id) DO NOTHING
       RETURNING *
     ), log AS (
       INSERT INTO parent_data_access_logs (parent_id, student_id, action, details)
       SELECT parent_id, student_id, 'privacy_created', ${PRIVACY_LOG_DETAILS} FROM ins
     )
     SELECT * FROM ins`,
    [req.user.id, req.child.student_id, value.counsellorAccess ?? null,
      value.parentMonitoring ?? null, value.researchShare ?? null]
  );

  if (!rows[0]) {
    return res.status(409).json({ error: 'Privacy settings already exist; update them instead', code: 'ALREADY_EXISTS' });
  }
  res.status(201).json({ preferences: toPrivacy(rows[0]) });
}

async function updatePrivacy(req, res) {
  const { value, error } = validatePrivacy(req.body, { partial: true });
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });

  const { rows } = await pool.query(
    `WITH changed AS (
       UPDATE privacy_preferences
       SET counsellor_access = COALESCE($3, counsellor_access),
           parent_monitoring = COALESCE($4, parent_monitoring),
           research_share    = COALESCE($5, research_share),
           updated_at = NOW()
       WHERE parent_id = $1 AND student_id = $2
       RETURNING *
     ), log AS (
       INSERT INTO parent_data_access_logs (parent_id, student_id, action, details)
       SELECT parent_id, student_id, 'privacy_updated', ${PRIVACY_LOG_DETAILS} FROM changed
     )
     SELECT * FROM changed`,
    [req.user.id, req.child.student_id, value.counsellorAccess ?? null,
      value.parentMonitoring ?? null, value.researchShare ?? null]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: 'No privacy settings saved yet; create them first', code: 'NOT_FOUND' });
  }
  res.json({ preferences: toPrivacy(rows[0]) });
}

// "Withdraw consent & erase shared data": removes the saved preferences so
// nothing is shared (NO_CONSENT_PRIVACY applies until the parent saves again).
async function deletePrivacy(req, res) {
  const { rows } = await pool.query(
    `WITH removed AS (
       DELETE FROM privacy_preferences WHERE parent_id = $1 AND student_id = $2
       RETURNING parent_id, student_id
     ), log AS (
       INSERT INTO parent_data_access_logs (parent_id, student_id, action)
       SELECT parent_id, student_id, 'privacy_withdrawn' FROM removed
     )
     SELECT * FROM removed`,
    [req.user.id, req.child.student_id]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: 'No privacy settings to withdraw', code: 'NOT_FOUND' });
  }
  res.json({ withdrawn: true, preferences: noConsent() });
}

module.exports = {
  listChildren,
  getDashboard,
  getProgress,
  getGuidance,
  getReport,
  listAccessLogs,
  listInquiries,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getPrivacy,
  createPrivacy,
  updatePrivacy,
  deletePrivacy,
};
