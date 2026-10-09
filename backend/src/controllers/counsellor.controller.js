const pool = require('../db');
const { getQuizResults } = require('../services/studentResults');
const { parseId, validateGuidance, validateSettings } = require('../validators/counsellor.validators');
const matching = require('../services/counsellorMatching');

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
            -- Top match: the student's aptitude-test result first, else the best course for their stream.
            COALESCE(ar.matches->0->>'title', top_course.degree_name) AS top_match_name,
            COALESCE((ar.matches->0->>'matchPercent')::int, top_course.match_percent) AS top_match_percent
     FROM users s
     LEFT JOIN aptitude_results ar ON ar.student_id = s.id
     LEFT JOIN counsellor_guidance_records g
       ON g.student_id = s.id AND g.counsellor_id = $1
     LEFT JOIN LATERAL (
       SELECT degree_name, match_percent
       FROM courses
       WHERE regexp_replace(regexp_replace(lower(courses.al_stream), 'stream', '', 'g'), '[^a-z]', '', 'g')
           = regexp_replace(regexp_replace(lower(s.al_stream), 'stream', '', 'g'), '[^a-z]', '', 'g')
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

function suggestedPathways(assessment, student) {
  const text = `${student?.stream || ''} ${(assessment?.matchedCareers || []).map((item) => item.title).join(' ')}`.toLowerCase();
  const suggestions = [];
  const add = (value) => { if (!suggestions.includes(value)) suggestions.push(value); };
  if (/commerce|business|management|marketing|account/.test(text)) {
    add('Business Management'); add('Marketing'); add('Accounting & Finance');
  }
  if (/biology|medical|health|biomed/.test(text)) {
    add('Biomedical Science'); add('Medicine & Surgery');
  }
  if (/mechanical|engineering/.test(text)) add('Mechanical Engineering');
  if (/relation|politic|arts/.test(text)) add('International Relations');
  if (/data|ai|computer|software|math|technology|physical/.test(text)) {
    add('Data Science & AI'); add('Software Engineering'); add('Information Technology');
  }
  return suggestions;
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
    suggestedPathways: suggestedPathways(quiz, student),
    decisionSupportDisclaimer: "These matches support, not replace, your counsellor's advice.",
  });
}

async function notifyStudentGuidance(client, counsellorId, studentId, guidance) {
  const pathways = Array.isArray(guidance.recommended_pathways) ? guidance.recommended_pathways : [];
  const summary = guidance.assessment_summary?.trim() || 'Your counsellor has completed your career guidance.';
  const pathText = pathways.length ? ` Recommended pathways: ${pathways.join(', ')}.` : '';
  await client.query(
    `INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
     VALUES ($1, $2, $3, 'student', $4)`,
    ['Career guidance completed', `${summary}${pathText}`, counsellorId, studentId]
  );
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
  // Draft or final: the counsellor can remove their own record and start again.
  const { rows } = await pool.query(
    `DELETE FROM counsellor_guidance_records
     WHERE counsellor_id = $1 AND student_id = $2
     RETURNING id, guidance_status`,
    [req.user.id, studentId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Guidance record not found', code: 'NOT_FOUND' });
  res.json({ deleted: true, id: rows[0].id, guidanceStatus: rows[0].guidance_status });
}

// All guidance records this counsellor has written, for students still assigned to them,
// plus the assigned students who have no record yet (so the counsellor can create one).
async function listGuidance(req, res) {
  const assigned = await getAssignedStudents(req.user.id);
  const ids = assigned.map((s) => s.student_id);
  if (!ids.length) return res.json({ records: [], studentsWithout: [] });
  const { rows } = await pool.query(
    `SELECT g.*, s.full_name AS student_name, s.al_stream
     FROM counsellor_guidance_records g
     JOIN users s ON s.id = g.student_id
     WHERE g.counsellor_id = $1 AND g.student_id = ANY($2::int[])
     ORDER BY g.updated_at DESC`,
    [req.user.id, ids]
  );
  const withRecord = new Set(rows.map((r) => r.student_id));
  res.json({
    records: rows.map((r) => ({
      ...toGuidance(r),
      student: { id: r.student_id, name: r.student_name, stream: r.al_stream },
    })),
    studentsWithout: assigned
      .filter((s) => !withRecord.has(s.student_id))
      .map((s) => ({ id: s.student_id, name: s.student_name, stream: s.al_stream })),
  });
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
               'Your counsellor has reviewed your child''s career guidance.',
               $1, 'parent', l.parent_id
        FROM parent_student_links l
        WHERE l.student_id = $2
          AND l.parent_id = ANY($3::int[])
        RETURNING id, target_user_id`,
      [req.user.id, studentId, assignedStudent.consent_parent_ids]
    );
    await notifyStudentGuidance(client, req.user.id, studentId, guidance.rows[0]);
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

function toSettings(row) {
  return {
    counsellorId: row.counsellor_id,
    schoolAffiliation: row.school_affiliation,
    zone: row.zone,
    notificationsEnabled: row.notifications_enabled,
    emailAlertsEnabled: row.email_alerts_enabled,
    ugcHandbookVersion: row.ugc_handbook_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Create the profile details (first save). 409 if they already exist - use PUT to change them.
async function createSettings(req, res) {
  const { value, error } = validateSettings(req.body);
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });
  const { rows } = await pool.query(
    `INSERT INTO counsellor_settings
       (counsellor_id, school_affiliation, zone, notifications_enabled, email_alerts_enabled, ugc_handbook_version)
     VALUES ($1, $2, $3, COALESCE($4, TRUE), COALESCE($5, FALSE), $6)
     ON CONFLICT (counsellor_id) DO NOTHING
     RETURNING *`,
    [req.user.id, value.schoolAffiliation ?? null, value.zone ?? null,
      value.notificationsEnabled ?? null, value.emailAlertsEnabled ?? null, value.ugcHandbookVersion ?? null]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Profile details already exist. Update them instead.', code: 'EXISTS' });
  res.status(201).json({ settings: toSettings(rows[0]) });
}

// Clear the saved profile details and go back to the defaults.
async function deleteSettings(req, res) {
  const { rowCount } = await pool.query('DELETE FROM counsellor_settings WHERE counsellor_id = $1', [req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'No saved profile details to clear', code: 'NOT_FOUND' });
  res.json({ deleted: true });
}

// ---------- Courses this counsellor guides (drives student matching) ----------

async function listMyCourses(req, res) {
  const { rows } = await pool.query(
    `SELECT c.id, c.title, c.institute, c.stream,
            EXISTS (SELECT 1 FROM counsellor_courses cc WHERE cc.course_id = c.id AND cc.counsellor_id = $1) AS mine,
            (SELECT COUNT(*)::int FROM student_course_selections s
             WHERE s.course_id = c.id AND s.counsellor_id = $1) AS my_students
     FROM courses_list c
     ORDER BY c.title`,
    [req.user.id]
  );
  const map = (r) => ({ id: r.id, title: r.title, institute: r.institute, stream: r.stream, myStudents: r.my_students });
  res.json({ courses: rows.filter((r) => r.mine).map(map), available: rows.filter((r) => !r.mine).map(map) });
}

async function currentCourseIds(counsellorId) {
  const { rows } = await pool.query('SELECT course_id FROM counsellor_courses WHERE counsellor_id = $1', [counsellorId]);
  return rows.map((r) => r.course_id);
}

async function addMyCourse(req, res) {
  const courseId = parseId(req.body?.courseId);
  if (!courseId) return res.status(400).json({ error: 'Choose a course', code: 'VALIDATION' });
  const ids = await currentCourseIds(req.user.id);
  if (ids.includes(courseId)) return res.status(409).json({ error: 'You already guide this course', code: 'EXISTS' });
  try {
    await matching.setCounsellorCourses(req.user.id, [...ids, courseId]);
  } catch (err) {
    if (err instanceof matching.MatchingError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  res.status(201).json({ added: courseId });
}

// Students matched on a removed course are re-matched to another counsellor who guides it.
async function removeMyCourse(req, res) {
  const courseId = parseId(req.params.courseId);
  if (!courseId) return res.status(400).json({ error: 'Invalid course', code: 'VALIDATION' });
  const ids = await currentCourseIds(req.user.id);
  if (!ids.includes(courseId)) return res.status(404).json({ error: 'You do not guide this course', code: 'NOT_FOUND' });
  if (ids.length === 1) {
    return res.status(409).json({ error: 'Keep at least one course so students can be matched to you', code: 'LAST_COURSE' });
  }
  const result = await matching.setCounsellorCourses(req.user.id, ids.filter((id) => id !== courseId));
  res.json({ removed: courseId, rematched: result.rematched, unmatched: result.unmatched });
}

// ---------- Inquiries sent to this counsellor ----------
// Students ask through the course screens (table `inquiries`); parents ask through the
// Parent Portal (table `counsellor_inquiries`). A counsellor only sees inquiries addressed to them.

const TOPIC_LABEL = { fees: 'Fees', intake_dates: 'Intake dates', course_choice: 'Course choice', other: 'Other' };
const inquiryId = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

function validReply(text) {
  const t = typeof text === 'string' ? text.trim() : '';
  if (t.length < 2) return 'Write a reply first.';
  if (t.length > 1000) return 'Replies can be up to 1000 characters.';
  return '';
}

async function listInquiries(req, res) {
  const me = req.user.id;
  const [student, parent] = await Promise.all([
    pool.query(
      `SELECT i.id, i.subject, i.message, i.course_title, i.created_at, i.reply_message, i.replied_at,
              u.id AS student_id, u.full_name AS student_name, u.email AS student_email
       FROM inquiries i
       JOIN users u ON u.id = i.user_id
       WHERE i.counsellor_id = $1
       ORDER BY (i.reply_message IS NULL) DESC, i.created_at DESC`,
      [me]
    ),
    pool.query(
      `SELECT q.id, q.topic, q.message, q.status, q.reply, q.replied_at, q.created_at,
              p.full_name AS parent_name, p.email AS parent_email,
              s.id AS student_id, s.full_name AS student_name
       FROM counsellor_inquiries q
       JOIN users p ON p.id = q.parent_id
       JOIN users s ON s.id = q.student_id
       WHERE q.counsellor_id = $1
       ORDER BY (q.status = 'answered') ASC, q.created_at DESC`,
      [me]
    ),
  ]);
  const items = [
    ...student.rows.map((r) => ({
      type: 'student',
      id: r.id,
      from: r.student_name,
      fromEmail: r.student_email,
      studentId: r.student_id,
      studentName: r.student_name,
      subject: r.subject,
      context: r.course_title,
      message: r.message,
      reply: r.reply_message,
      repliedAt: r.replied_at,
      status: r.reply_message ? 'answered' : 'pending',
      createdAt: r.created_at,
    })),
    ...parent.rows.map((r) => ({
      type: 'parent',
      id: r.id,
      from: r.parent_name,
      fromEmail: r.parent_email,
      studentId: r.student_id,
      studentName: r.student_name,
      subject: `${TOPIC_LABEL[r.topic] || 'Question'} - about ${r.student_name}`,
      context: TOPIC_LABEL[r.topic] || r.topic,
      message: r.message,
      reply: r.reply,
      repliedAt: r.replied_at,
      status: r.status === 'answered' ? 'answered' : 'pending',
      createdAt: r.created_at,
    })),
  ].sort((a, b) => (a.status === b.status ? new Date(b.createdAt) - new Date(a.createdAt) : a.status === 'pending' ? -1 : 1));
  res.json({
    inquiries: items,
    counts: {
      total: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      answered: items.filter((i) => i.status === 'answered').length,
    },
  });
}

// Opening a parent's question marks it "read" (the parent can no longer edit it).
async function markParentInquiryRead(req, res) {
  const id = inquiryId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid inquiry', code: 'VALIDATION' });
  await pool.query(
    // updated_at is the parent's own edit time (shown as "Edited"), so it is not touched here.
    `UPDATE counsellor_inquiries SET status = 'read'
     WHERE id = $1 AND counsellor_id = $2 AND status = 'sent'`,
    [id, req.user.id]
  );
  res.json({ ok: true });
}

async function replyToInquiry(req, res) {
  const id = inquiryId(req.params.id);
  const { type } = req.params;
  const invalid = !id ? 'Invalid inquiry' : validReply(req.body?.reply);
  if (invalid) return res.status(400).json({ error: invalid, code: 'VALIDATION' });
  const reply = req.body.reply.trim();

  let result;
  if (type === 'student') {
    // is_read = false so the reply shows as new in the student's notifications.
    result = await pool.query(
      `UPDATE inquiries SET reply_message = $1, replied_at = NOW(), replied_by = $2, is_read = FALSE
       WHERE id = $3 AND counsellor_id = $2 RETURNING id`,
      [reply, req.user.id, id]
    );
  } else if (type === 'parent') {
    result = await pool.query(
      `UPDATE counsellor_inquiries SET reply = $1, replied_at = NOW(), status = 'answered'
       WHERE id = $3 AND counsellor_id = $2 RETURNING id`,
      [reply, req.user.id, id]
    );
  } else {
    return res.status(400).json({ error: 'Unknown inquiry type', code: 'VALIDATION' });
  }

  if (!result.rowCount) return res.status(404).json({ error: 'Inquiry not found', code: 'NOT_FOUND' });
  res.json({ ok: true, message: type === 'student' ? 'Reply sent to the student.' : 'Reply sent to the parent.' });
}

async function deleteInquiry(req, res) {
  const id = inquiryId(req.params.id);
  if (!id || !['student', 'parent'].includes(req.params.type)) {
    return res.status(400).json({ error: 'Invalid inquiry', code: 'VALIDATION' });
  }
  const table = req.params.type === 'student' ? 'inquiries' : 'counsellor_inquiries';
  const result = await pool.query(
    `DELETE FROM ${table} WHERE id = $1 AND counsellor_id = $2 RETURNING id`,
    [id, req.user.id]
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Inquiry not found', code: 'NOT_FOUND' });
  res.json({ deleted: true, id });
}

module.exports = {
  listInquiries,
  markParentInquiryRead,
  replyToInquiry,
  deleteInquiry,
  getDashboard,
  listStudents,
  getStudentProfile,
  getGuidance,
  saveGuidance,
  updateGuidance,
  deleteGuidance,
  listGuidance,
  markReviewed,
  getSettings,
  createSettings,
  updateSettings,
  deleteSettings,
  listMyCourses,
  addMyCourse,
  removeMyCourse,
};
