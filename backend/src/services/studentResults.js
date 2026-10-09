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

async function getQuizResults(studentId) {
  const r = PLACEHOLDER_RESULTS[studentId];
  return r
    ? { ...r, source: 'placeholder' }
    : { status: 'not_started', completedAt: null, zScore: null, district: null,
        scores: [], matchedCareers: [], source: 'placeholder' };
}

async function getCounsellorNote(studentId, parentId) {
  if (!Number.isSafeInteger(Number(studentId)) || !Number.isSafeInteger(Number(parentId))) return null;

  const { rows } = await pool.query(
    `SELECT g.recommended_pathways, g.reviewed_at
     FROM counsellor_guidance_records g
     JOIN parent_student_links l
       ON l.student_id = g.student_id
      AND l.counsellor_id = g.counsellor_id
      AND l.parent_id = $2
     JOIN privacy_preferences pp
       ON pp.parent_id = l.parent_id
      AND pp.student_id = l.student_id
      AND pp.counsellor_access = TRUE
     WHERE g.student_id = $1
       AND g.guidance_status = 'final'
       AND g.reviewed_at IS NOT NULL
       AND g.shared_with_parent = TRUE
     ORDER BY g.reviewed_at DESC
     LIMIT 1`,
    [studentId, parentId]
  );

  if (!rows[0]) return null;
  return {
    // Assessment summaries are counsellor-private and are intentionally not
    // included in any parent-facing response.
    summary: null,
    recommendedPathways: rows[0].recommended_pathways,
    lastReviewedAt: rows[0].reviewed_at,
    source: 'counsellor_guidance',
  };
}

module.exports = { getQuizResults, getCounsellorNote };
