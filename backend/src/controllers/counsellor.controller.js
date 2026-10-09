const pool = require('../db');
const { getQuizResults } = require('../services/studentResults');
const { parseId, validateGuidance, validateSettings } = require('../validators/counsellor.validators');

const NOT_SHARED = {
  access: 'not_shared',
  message: 'Assessment data has not been shared with the assigned counsellor.',
};

function parseListFilters(query) {
  const status = query.status && String(query.status).toLowerCase();
  return {
    search: typeof query.search === 'string' ? query.search.trim() : '',
    stream: typeof query.stream === 'string' ? query.stream.trim() : '',
    status: ['pending', 'reviewed'].includes(status) ? status : null,
  };
}

function toStatus(row) {
  return row.guidance_status === 'final' && row.reviewed_at ? 'reviewed' : 'pending_review';
}

function toStudent(row) {
  const status = toStatus(row);
  return {
    id: row.student_id,
    name: row.student_name,
    initials: row.avatar_initials || row.student_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase(),
    indexNo: null,
    stream: row.al_stream,
    status,
    assessmentAccess: row.counsellor_access ? 'shared' : 'not_shared',
    topMatch: row.counsellor_access && row.top_match_name
      ? { title: row.top_match_name, matchPercent: row.top_match_percent }
      : null,
    guidanceId: row.guidance_id,
    reviewedAt: row.reviewed_at,
    updatedAt: row.guidance_updated_at,
  };
}

// Single source of truth for counsellor assignment and consent scope.
// A counsellor's students are the ones MATCHED to them through the course the student chose
// (student_course_selections). Students who haven't chosen a course yet fall back to the
// counsellor on their parent link. Consent: parents' privacy setting when the student has a
// linked parent; a student with no parent link consented by choosing the course themselves.
async function getAssignedStudents(counsellorId) {
  const { rows } = await pool.query(
    `WITH assigned AS (
       SELECT sel.student_id FROM student_course_selections sel WHERE sel.counsellor_id = $1
       UNION
       SELECT l.student_id FROM parent_student_links l
       WHERE l.counsellor_id = $1
         AND NOT EXISTS (SELECT 1 FROM student_course_selections x WHERE x.student_id = l.student_id)
     )
     SELECT s.id AS student_id, s.full_name AS student_name, s.avatar_initials, s.al_stream,
            CASE WHEN COUNT(l.parent_id) = 0 THEN TRUE
                 ELSE COALESCE(BOOL_OR(pp.counsellor_access), FALSE) END AS counsellor_access,
            COALESCE(
              ARRAY_AGG(DISTINCT l.parent_id) FILTER (WHERE pp.counsellor_access = TRUE),
              ARRAY[]::INTEGER[]
            ) AS consent_parent_ids
     FROM assigned a
     JOIN users s ON s.id = a.student_id AND s.role = 'student'
     LEFT JOIN parent_student_links l ON l.student_id = s.id
     LEFT JOIN privacy_preferences pp
       ON pp.parent_id = l.parent_id AND pp.student_id = l.student_id
     GROUP BY s.id, s.full_name, s.avatar_initials, s.al_stream
     ORDER BY s.id, s.full_name`,
    [counsellorId]
  );
  return rows;
}

async function queryStudents(counsellorId, filters = {}) {
  const assignedStudents = await getAssignedStudents(counsellorId);
  if (!assignedStudents.length) return [];

  const assignedIds = assignedStudents.map((student) => student.student_id);
  const consentByStudent = new Map(
    assignedStudents.map((student) => [student.student_id, student.counsellor_access])
  );
  const values = [counsellorId, assignedIds];
  const where = ['s.id = ANY($2::int[])', "s.role = 'student'"];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    where.push(`s.full_name ILIKE $${values.length}`);
  }
  if (filters.stream) {
    values.push(filters.stream);
    where.push(`s.al_stream = $${values.length}`);
  }

  const statusExpression = "CASE WHEN g.guidance_status = 'final' AND g.reviewed_at IS NOT NULL THEN 'reviewed' ELSE 'pending' END";
  if (filters.status === 'reviewed') where.push(`${statusExpression} = 'reviewed'`);
  if (filters.status === 'pending') where.push(`${statusExpression} = 'pending'`);

  const { rows } = await pool.query(
    `SELECT DISTINCT ON (s.id)
            s.id AS student_id, s.full_name AS student_name, s.avatar_initials, s.al_stream,
            g.id AS guidance_id, g.guidance_status, g.reviewed_at, g.updated_at AS guidance_updated_at,
            g.shared_with_parent,
            top_course.degree_name AS top_match_name,
            top_course.match_percent AS top_match_percent
     FROM users s
     LEFT JOIN counsellor_guidance_records g
       ON g.student_id = s.id AND g.counsellor_id = $1
     LEFT JOIN LATERAL (
       SELECT degree_name, match_percent
       FROM courses
       WHERE courses.al_stream = s.al_stream
       ORDER BY match_percent DESC NULLS LAST, id
       LIMIT 1
     ) top_course ON TRUE
     WHERE ${where.join(' AND ')}
     ORDER BY s.id, s.full_name`,
    values
  );
  return rows.map((row) => ({
    ...row,
    counsellor_access: consentByStudent.get(row.student_id) === true,
  }));
}

async function listStudents(req, res) {
  const filters = parseListFilters(req.query);
  const rows = await queryStudents(req.user.id, filters);
  res.json({ students: rows.map(toStudent) });
}

async function getDashboard(req, res) {
  const filters = parseListFilters(req.query);
  const assignedStudents = await getAssignedStudents(req.user.id);
  const assignedIds = assignedStudents.map((student) => student.student_id);
  const [students, statsResult] = await Promise.all([
    queryStudents(req.user.id, filters),
    pool.query(
      `SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (
                 WHERE EXISTS (
                   SELECT 1 FROM counsellor_guidance_records g
                   WHERE g.counsellor_id = $1 AND g.student_id = assigned.student_id
                     AND g.guidance_status = 'final' AND g.reviewed_at IS NOT NULL
                 )
               )::int AS reviewed
       FROM unnest($2::int[]) AS assigned(student_id)`,
      [req.user.id, assignedIds]
    ),
  ]);
  const stats = statsResult.rows[0];
  res.json({
    counsellor: { id: req.user.id, name: req.user.fullName, title: 'Senior Counsellor' },
    stats: {
      totalStudents: stats.total,
      reviewed: stats.reviewed,
      pendingReviews: stats.total - stats.reviewed,
      reviewedPercent: stats.total ? Math.round((stats.reviewed / stats.total) * 100) : 0,
    },
    students: students.map(toStudent),
  });
}

async function findAssignedStudent(counsellorId, studentId) {
  const students = await getAssignedStudents(counsellorId);
  return students.find((student) => student.student_id === studentId) || null;
}

function toGuidance(row) {
  if (!row) return null;
  return {
    id: row.id,
    assessmentSummary: row.assessment_summary,
    recommendedPathways: row.recommended_pathways,
    guidanceStatus: row.guidance_status,
    sharedWithParent: row.shared_with_parent,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getStudentProfile(req, res) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) return res.status(400).json({ error: 'Invalid student id', code: 'VALIDATION' });
  const student = await findAssignedStudent(req.user.id, studentId);
  if (!student) return res.status(404).json({ error: 'Assigned student not found', code: 'NOT_FOUND' });

  const [quiz, guidanceResult] = await Promise.all([
    student.counsellor_access ? getQuizResults(studentId) : null,
    pool.query(
      `SELECT * FROM counsellor_guidance_records WHERE counsellor_id = $1 AND student_id = $2`,
      [req.user.id, studentId]
    ),
  ]);

  const guidance = guidanceResult.rows[0] || null;
  res.json({
    student: {
      id: student.student_id,
      name: student.student_name,
      initials: student.avatar_initials,
      indexNo: null,
      stream: student.al_stream,
      status: guidance && guidance.guidance_status === 'final' && guidance.reviewed_at ? 'reviewed' : 'pending_review',
    },
    assessment: student.counsellor_access
      ? {
          status: quiz.status,
          completedAt: quiz.completedAt,
          zScore: quiz.zScore,
          district: quiz.district,
          scores: quiz.scores,
          matchedCareers: quiz.matchedCareers.slice(0, 3),
          source: 'aptitude assessment - verified',
        }
      : NOT_SHARED,
    guidance: toGuidance(guidance),
    decisionSupportDisclaimer: "These matches support, not replace, your counsellor's advice.",
  });
}

async function getGuidance(req, res) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) return res.status(400).json({ error: 'Invalid student id', code: 'VALIDATION' });
  if (!(await findAssignedStudent(req.user.id, studentId))) {
    return res.status(404).json({ error: 'Assigned student not found', code: 'NOT_FOUND' });
  }
  const { rows } = await pool.query(
    `SELECT * FROM counsellor_guidance_records WHERE counsellor_id = $1 AND student_id = $2`,
    [req.user.id, studentId]
  );
  res.json({ guidance: toGuidance(rows[0]) });
}

async function saveGuidance(req, res) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) return res.status(400).json({ error: 'Invalid student id', code: 'VALIDATION' });
  const assignedStudent = await findAssignedStudent(req.user.id, studentId);
  if (!assignedStudent) {
    return res.status(404).json({ error: 'Assigned student not found', code: 'NOT_FOUND' });
  }
  const { value, error } = validateGuidance(req.body);
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });
  if (value.sharedWithParent === true && !assignedStudent.counsellor_access) {
    return res.status(409).json({ error: 'Parent sharing requires counsellor access consent', code: 'CONSENT_REQUIRED' });
  }

  const existing = await pool.query(
    `SELECT guidance_status, reviewed_at
     FROM counsellor_guidance_records
     WHERE counsellor_id = $1 AND student_id = $2`,
    [req.user.id, studentId]
  );
  if (existing.rows[0]?.guidance_status === 'final' && value.guidanceStatus === 'draft') {
    return res.status(409).json({ error: 'Final guidance cannot return to draft', code: 'INVALID_STATUS_TRANSITION' });
  }
  if (existing.rows[0]?.reviewed_at && value.sharedWithParent === false) {
    return res.status(409).json({ error: 'Reviewed guidance must remain shared with the parent', code: 'INVALID_STATUS_TRANSITION' });
  }

  const { rows } = await pool.query(
    `INSERT INTO counsellor_guidance_records
       (counsellor_id, student_id, assessment_summary, recommended_pathways, guidance_status, shared_with_parent)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (counsellor_id, student_id) DO UPDATE SET
       assessment_summary = EXCLUDED.assessment_summary,
       recommended_pathways = EXCLUDED.recommended_pathways,
       guidance_status = CASE
         WHEN counsellor_guidance_records.guidance_status = 'final' THEN 'final'
         ELSE EXCLUDED.guidance_status
       END,
       shared_with_parent = EXCLUDED.shared_with_parent,
       updated_at = NOW()
     RETURNING *`,
    [req.user.id, studentId, value.assessmentSummary, JSON.stringify(value.recommendedPathways),
      value.guidanceStatus || existing.rows[0]?.guidance_status || 'draft',
      value.sharedWithParent ?? (existing.rows[0]?.reviewed_at ? true : false)]
  );
  res.status(201).json({ guidance: toGuidance(rows[0]) });
}

async function updateGuidance(req, res) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) return res.status(400).json({ error: 'Invalid student id', code: 'VALIDATION' });
  const { value, error } = validateGuidance(req.body, { partial: true });
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });
  const student = await findAssignedStudent(req.user.id, studentId);
  if (!student) return res.status(404).json({ error: 'Assigned student not found', code: 'NOT_FOUND' });
  if (value.sharedWithParent === true && !student.counsellor_access) {
    return res.status(409).json({ error: 'Parent sharing requires counsellor access consent', code: 'CONSENT_REQUIRED' });
  }

  const existing = await pool.query(
    `SELECT guidance_status, reviewed_at
     FROM counsellor_guidance_records
     WHERE counsellor_id = $1 AND student_id = $2`,
    [req.user.id, studentId]
  );
  if (!existing.rows[0]) return res.status(404).json({ error: 'Guidance record not found', code: 'NOT_FOUND' });
  if (existing.rows[0].guidance_status === 'final' && value.guidanceStatus === 'draft') {
    return res.status(409).json({ error: 'Final guidance cannot return to draft', code: 'INVALID_STATUS_TRANSITION' });
  }
  if (existing.rows[0].reviewed_at && value.sharedWithParent === false) {
    return res.status(409).json({ error: 'Reviewed guidance must remain shared with the parent', code: 'INVALID_STATUS_TRANSITION' });
  }

  const { rows } = await pool.query(
    `UPDATE counsellor_guidance_records
     SET assessment_summary = COALESCE($3, assessment_summary),
         recommended_pathways = COALESCE($4::jsonb, recommended_pathways),
         guidance_status = CASE WHEN guidance_status = 'final' THEN 'final' ELSE COALESCE($5, guidance_status) END,
         shared_with_parent = COALESCE($6, shared_with_parent),
         updated_at = NOW()
     WHERE counsellor_id = $1 AND student_id = $2
     RETURNING *`,
    [req.user.id, studentId, value.assessmentSummary ?? null,
      value.recommendedPathways ? JSON.stringify(value.recommendedPathways) : null,
      value.guidanceStatus ?? null, value.sharedWithParent ?? null]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Guidance record not found', code: 'NOT_FOUND' });
  res.json({ guidance: toGuidance(rows[0]) });
}

async function deleteGuidance(req, res) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) return res.status(400).json({ error: 'Invalid student id', code: 'VALIDATION' });
  if (!(await findAssignedStudent(req.user.id, studentId))) {
    return res.status(404).json({ error: 'Assigned student not found', code: 'NOT_FOUND' });
  }
  const { rows } = await pool.query(
    `DELETE FROM counsellor_guidance_records
     WHERE counsellor_id = $1 AND student_id = $2 AND guidance_status = 'draft'
     RETURNING id`,
    [req.user.id, studentId]
  );
  if (rows[0]) return res.json({ deleted: true, id: rows[0].id });
  const existing = await pool.query(
    `SELECT guidance_status FROM counsellor_guidance_records WHERE counsellor_id = $1 AND student_id = $2`,
    [req.user.id, studentId]
  );
  if (!existing.rows[0]) return res.status(404).json({ error: 'Guidance record not found', code: 'NOT_FOUND' });
  return res.status(409).json({ error: 'Reviewed guidance cannot be deleted', code: 'REVIEW_LOCKED' });
}

async function markReviewed(req, res) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) return res.status(400).json({ error: 'Invalid student id', code: 'VALIDATION' });
  const assignedStudent = await findAssignedStudent(req.user.id, studentId);
  if (!assignedStudent) {
    return res.status(404).json({ error: 'Assigned student not found', code: 'NOT_FOUND' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const guidance = await client.query(
      `UPDATE counsellor_guidance_records
       SET guidance_status = 'final',
           shared_with_parent = $3,
           reviewed_at = NOW(), updated_at = NOW()
       WHERE counsellor_id = $1 AND student_id = $2
       RETURNING *`,
      [req.user.id, studentId, assignedStudent.consent_parent_ids.length > 0]
    );
    if (!guidance.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Guidance record not found; save the form first', code: 'NOT_FOUND' });
    }

    const notifications = await client.query(
      `INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
        SELECT 'Guidance reviewed',
               'Your counsellor has reviewed the student guidance profile.',
               $1, 'parent', l.parent_id
        FROM parent_student_links l
        WHERE l.student_id = $2
          AND l.parent_id = ANY($3::int[])
        RETURNING id, target_user_id`,
      [req.user.id, studentId, assignedStudent.consent_parent_ids]
    );
    await client.query('COMMIT');
    res.json({ guidance: toGuidance(guidance.rows[0]), notificationsCreated: notifications.rowCount });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getSettings(req, res) {
  await getAssignedStudents(req.user.id);
  const { rows } = await pool.query(
    `SELECT * FROM counsellor_settings WHERE counsellor_id = $1`,
    [req.user.id]
  );
  const row = rows[0];
  res.json({
    settings: row ? {
      counsellorId: row.counsellor_id,
      schoolAffiliation: row.school_affiliation,
      zone: row.zone,
      notificationsEnabled: row.notifications_enabled,
      emailAlertsEnabled: row.email_alerts_enabled,
      ugcHandbookVersion: row.ugc_handbook_version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } : {
      counsellorId: req.user.id,
      notificationsEnabled: true,
      emailAlertsEnabled: false,
      schoolAffiliation: null,
      zone: null,
      ugcHandbookVersion: null,
    },
  });
}

async function updateSettings(req, res) {
  await getAssignedStudents(req.user.id);
  const { value, error } = validateSettings(req.body, { partial: true });
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });
  const { rows } = await pool.query(
    `INSERT INTO counsellor_settings
       (counsellor_id, school_affiliation, zone, notifications_enabled, email_alerts_enabled, ugc_handbook_version)
     VALUES ($1, $2, $3, COALESCE($4, TRUE), COALESCE($5, FALSE), $6)
     ON CONFLICT (counsellor_id) DO UPDATE SET
       school_affiliation = COALESCE($2, counsellor_settings.school_affiliation),
       zone = COALESCE($3, counsellor_settings.zone),
       notifications_enabled = COALESCE($4, counsellor_settings.notifications_enabled),
       email_alerts_enabled = COALESCE($5, counsellor_settings.email_alerts_enabled),
       ugc_handbook_version = COALESCE($6, counsellor_settings.ugc_handbook_version),
       updated_at = NOW()
     RETURNING *`,
    [req.user.id, value.schoolAffiliation ?? null, value.zone ?? null,
      value.notificationsEnabled ?? null, value.emailAlertsEnabled ?? null, value.ugcHandbookVersion ?? null]
  );
  const row = rows[0];
  res.json({ settings: {
    counsellorId: row.counsellor_id,
    schoolAffiliation: row.school_affiliation,
    zone: row.zone,
    notificationsEnabled: row.notifications_enabled,
    emailAlertsEnabled: row.email_alerts_enabled,
    ugcHandbookVersion: row.ugc_handbook_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } });
}

module.exports = {
  getDashboard,
  listStudents,
  getStudentProfile,
  getGuidance,
  saveGuidance,
  updateGuidance,
  deleteGuidance,
  markReviewed,
  getSettings,
  updateSettings,
};
