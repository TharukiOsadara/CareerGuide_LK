const pool = require('../db');

// Quiz/results are still supplied by the existing placeholder provider until
// the quiz module publishes its database tables. Counsellor guidance is read
// from the real module tables below.
// The quiz/results tables (Piyarathna) and counsellor notes are not built yet.
// When they exist, replace only these two functions with real queries; the
// returned shape is what the parent API and the PDF report depend on.

const PLACEHOLDER_RESULTS = {
  2: {
    status: 'completed',
    completedAt: '2026-10-01T09:30:00.000Z',
    zScore: 1.425,
    district: 'Colombo',
    scores: [
      { area: 'Logical Reasoning', percent: 92 },
      { area: 'Analytical Thinking', percent: 88 },
      { area: 'Creative / Design', percent: 70 },
      { area: 'Communication', percent: 74 },
    ],
    matchedCareers: [
      { title: 'Software Engineering', matchPercent: 96 },
      { title: 'Data Science', matchPercent: 91 },
      { title: 'Computer Systems Engineering', matchPercent: 87 },
    ],
  },
  3: {
    status: 'in_progress',
    completedAt: null,
    zScore: null,
    district: 'Colombo',
    scores: [],
    matchedCareers: [],
  },
};

const PLACEHOLDER_NOTES = {
  2: {
    // Must agree with the course data: her 1.4250 is below the 1.75+ cut-offs.
    summary:
      'Strong logical aptitude, well suited to computing. Her predicted Z-score of 1.4250 is below ' +
      'the island-wide cut-offs for her top-matched degrees (1.75 and above), so we will also review ' +
      'NVQ Level 7 and other computing pathways.',
    nextSteps: [
      'Review NVQ Level 7 computing options',
      'Compare fees for non-state degree programmes',
      'Book a follow-up session after A/L results',
    ],
    lastReviewedAt: '2026-10-05T16:15:00.000Z',
  },
};

// Real results from the student's aptitude test (Quiz tab), stored in aptitude_results.
// Falls back to the old placeholder data for students who haven't taken the test.
async function getQuizResults(studentId) {
  const sid = Number(studentId);
  if (Number.isSafeInteger(sid)) {
    const { rows } = await pool.query(
      `SELECT a.stream, a.scores, a.matches, a.completed_at, u.z_score, ap.district
       FROM aptitude_results a
       JOIN users u ON u.id = a.student_id
       LEFT JOIN academic_profiles ap ON ap.user_id = a.student_id
       WHERE a.student_id = $1`,
      [sid]
    );
    const row = rows[0];
    if (row) {
      return {
        status: 'completed',
        completedAt: row.completed_at,
        zScore: row.z_score == null ? null : Number(row.z_score),
        district: row.district || null,
        stream: row.stream,
        scores: Array.isArray(row.scores) ? row.scores : [],
        matchedCareers: Array.isArray(row.matches) ? row.matches : [],
        source: 'aptitude_test',
      };
    }
  }
  const r = PLACEHOLDER_RESULTS[studentId];
  return r
    ? { ...r, source: 'placeholder' }
    : { status: 'not_started', completedAt: null, zScore: null, district: null,
        scores: [], matchedCareers: [], source: 'placeholder' };
}

function toNote(row) {
  if (!row) return null;
  const pathways = Array.isArray(row.recommended_pathways) ? row.recommended_pathways : [];
  return {
    summary: row.assessment_summary?.trim() || null,
    nextSteps: pathways,
    recommendedPathways: pathways,
    status: row.guidance_status,
    reviewed: Boolean(row.reviewed_at),
    lastReviewedAt: row.reviewed_at || row.updated_at,
    counsellor: { id: row.counsellor_id, name: row.counsellor_name },
    source: 'counsellor_guidance',
  };
}

// Guidance a counsellor finalised and chose to share with the parent ("Share with Parent"
// switch, or "Mark as Reviewed & Notify Parent"). The parent-child link is already checked
// by the parent middleware; the newest shared record wins if the student changed counsellor.
async function getCounsellorNote(studentId) {
  if (!Number.isSafeInteger(Number(studentId))) return null;
  const { rows } = await pool.query(
    `SELECT g.*, c.full_name AS counsellor_name
     FROM counsellor_guidance_records g
     JOIN users c ON c.id = g.counsellor_id
     WHERE g.student_id = $1
       AND g.guidance_status = 'final'
       AND g.shared_with_parent = TRUE
     ORDER BY COALESCE(g.reviewed_at, g.updated_at) DESC
     LIMIT 1`,
    [studentId]
  );
  return toNote(rows[0]);
}

// The student sees their own counsellor's finalised guidance (sharing with the parent not required).
async function getStudentGuidance(studentId) {
  if (!Number.isSafeInteger(Number(studentId))) return null;
  const { rows } = await pool.query(
    `SELECT g.*, c.full_name AS counsellor_name
     FROM counsellor_guidance_records g
     JOIN users c ON c.id = g.counsellor_id
     WHERE g.student_id = $1 AND g.guidance_status = 'final'
     ORDER BY COALESCE(g.reviewed_at, g.updated_at) DESC
     LIMIT 1`,
    [studentId]
  );
  return toNote(rows[0]);
}

module.exports = { getQuizResults, getCounsellorNote, getStudentGuidance };