const pool = require('../db');
const bcrypt = require('bcryptjs');
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
    courseId: query.courseId ? Number(query.courseId) : null,
    page: query.page ? Number(query.page) : 1,
    pageSize: query.pageSize ? Math.min(Number(query.pageSize), 50) : 20,
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

async function isSeniorCounsellor(counsellorId) {
  const { rows } = await pool.query(
    `SELECT is_senior FROM users WHERE id = $1 AND role = 'counsellor' AND status = 'active'`, [counsellorId]
  );
  return rows[0]?.is_senior === true;
}

async function findAuthorizedInquiry(inquiryId, counsellorId) {
  const { rows } = await pool.query(
    `SELECT i.id, i.user_id AS "studentId", u.full_name AS "studentName", i.course_title AS "courseTitle",
            i.subject, i.message, i.reply_message AS "replyMessage", i.replied_at AS "repliedAt",
            i.replied_by AS "repliedBy", rb.full_name AS "repliedByName", i.is_read AS "isRead"
       FROM inquiries i
       JOIN users u ON u.id = i.user_id
       LEFT JOIN users rb ON rb.id = i.replied_by
       LEFT JOIN courses_list c ON (i.course_id IS NOT NULL AND c.id = i.course_id)
                                OR (i.course_id IS NULL AND c.title = i.course_title)
       JOIN users viewer ON viewer.id = $2 AND viewer.role = 'counsellor' AND viewer.status = 'active'
      WHERE i.id = $1 AND (viewer.is_senior = TRUE OR c.counsellor_id = $2)
      ORDER BY c.id LIMIT 1`, [inquiryId, counsellorId]
  );
  return rows[0] || null;
}

// Single source of truth for counsellor assignment and consent scope.
// Assignment currently comes from parent_student_links.counsellor_id.
async function getAssignedStudents(counsellorId) {
  const { rows } = await pool.query(
    `SELECT s.id AS student_id, s.full_name AS student_name, s.avatar_initials, s.al_stream,
            COALESCE(BOOL_OR(pp.counsellor_access), FALSE) AS counsellor_access,
            COALESCE(
              ARRAY_AGG(DISTINCT l.parent_id) FILTER (WHERE pp.counsellor_access = TRUE),
              ARRAY[]::INTEGER[]
            ) AS consent_parent_ids
     FROM parent_student_links l
     JOIN users s ON s.id = l.student_id
     LEFT JOIN privacy_preferences pp
       ON pp.parent_id = l.parent_id AND pp.student_id = l.student_id
     WHERE l.counsellor_id = $1 AND s.role = 'student'
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
  if (filters.courseId) {
    values.push(filters.courseId);
    where.push(`EXISTS (
      SELECT 1 FROM inquiries course_inquiry
      JOIN courses_list assigned_course ON assigned_course.title = course_inquiry.course_title
       AND assigned_course.counsellor_id = $1
      WHERE course_inquiry.user_id = s.id AND assigned_course.id = $${values.length}
    )`);
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
  const start = (filters.page - 1) * filters.pageSize;
  res.json({
    students: rows.slice(start, start + filters.pageSize).map(toStudent),
    pagination: { page: filters.page, pageSize: filters.pageSize, total: rows.length, pages: Math.ceil(rows.length / filters.pageSize) },
  });
}

async function listAssignedCourses(req, res) {
  const senior = await isSeniorCounsellor(req.user.id);
  const { rows } = await pool.query(
    `SELECT id, title, stream, institute FROM courses_list
      WHERE ($1 = TRUE OR counsellor_id = $2) ORDER BY title, institute`, [senior, req.user.id]
  );
  res.json({ courses: rows });
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
    counsellor: { id: req.user.id, name: req.user.fullName, title: req.user.isSenior ? 'Senior Counsellor' : 'Counsellor', isSenior: req.user.isSenior === true },
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

  const [quiz, guidanceResult, academicResult, inquiryResult] = await Promise.all([
    student.counsellor_access ? getQuizResults(studentId) : null,
    pool.query(
      `SELECT * FROM counsellor_guidance_records WHERE counsellor_id = $1 AND student_id = $2`,
      [req.user.id, studentId]
    ),
    pool.query(
      `SELECT subject_stream AS "subjectStream", district, z_score AS "zScore", subject_grades AS "subjectGrades"
         FROM academic_profiles WHERE user_id = $1`, [studentId]
    ),
    pool.query(
      `SELECT id, course_title AS "courseTitle", subject, message,
              reply_message AS "replyMessage", replied_at AS "repliedAt"
         FROM inquiries WHERE user_id = $1 AND counsellor_id = $2 ORDER BY id DESC`, [studentId, req.user.id]
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
    academicProfile: academicResult.rows[0] || null,
    inquiries: inquiryResult.rows,
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

async function listGuidance(req, res) {
  const { rows } = await pool.query(
    `SELECT g.*, s.full_name AS student_name
       FROM counsellor_guidance_records g JOIN users s ON s.id = g.student_id
      WHERE g.counsellor_id = $1 ORDER BY g.updated_at DESC`, [req.user.id]
  );
  res.json({ guidance: rows.map((row) => ({ ...toGuidance(row), studentId: row.student_id, studentName: row.student_name })) });
}

async function getGuidanceById(req, res) {
  const id = parseId(req.params.guidanceId);
  if (!id) return res.status(400).json({ error: 'Invalid guidance id', code: 'VALIDATION' });
  const { rows } = await pool.query(
    `SELECT g.*, s.full_name AS student_name FROM counsellor_guidance_records g
      JOIN users s ON s.id = g.student_id WHERE g.id = $1 AND g.counsellor_id = $2`, [id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Guidance record not found', code: 'NOT_FOUND' });
  res.json({ guidance: { ...toGuidance(rows[0]), studentId: rows[0].student_id, studentName: rows[0].student_name } });
}

async function deleteGuidanceById(req, res) {
  const id = parseId(req.params.guidanceId);
  if (!id) return res.status(400).json({ error: 'Invalid guidance id', code: 'VALIDATION' });
  const { rows } = await pool.query(
    `DELETE FROM counsellor_guidance_records WHERE id = $1 AND counsellor_id = $2 AND guidance_status = 'draft' RETURNING id`, [id, req.user.id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Guidance record not found or is review-locked', code: 'REVIEW_LOCKED' });
  res.json({ deleted: true, id });
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

async function getProfile(req, res) {
  const { rows } = await pool.query(
    `SELECT id, full_name AS "fullName", email, role, status, is_senior AS "isSenior", al_stream AS "alStream",
            profile_picture AS "profilePicture", avatar_initials AS initials
       FROM users WHERE id = $1 AND role = 'counsellor'`,
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Counsellor profile not found', code: 'NOT_FOUND' });
  res.json({ profile: rows[0] });
}

async function updateProfile(req, res) {
  const { fullName, profilePicture } = req.body || {};
  if (fullName !== undefined && (typeof fullName !== 'string' || !fullName.trim())) {
    return res.status(400).json({ error: 'fullName must be a non-empty string', code: 'VALIDATION' });
  }
  if (profilePicture !== undefined && profilePicture !== null && typeof profilePicture !== 'string') {
    return res.status(400).json({ error: 'profilePicture must be text or null', code: 'VALIDATION' });
  }
  if (fullName === undefined && profilePicture === undefined) {
    return res.status(400).json({ error: 'Nothing to update', code: 'VALIDATION' });
  }
  const { rows } = await pool.query(
    `UPDATE users SET full_name = CASE WHEN $1::boolean THEN $2 ELSE full_name END,
                      profile_picture = CASE WHEN $3::boolean THEN $4 ELSE profile_picture END
     WHERE id = $5 AND role = 'counsellor'
     RETURNING id, full_name AS "fullName", email, role, status, al_stream AS "alStream",
               profile_picture AS "profilePicture", avatar_initials AS initials`,
    [fullName !== undefined, fullName === undefined ? null : fullName.trim(),
      profilePicture !== undefined, profilePicture === undefined ? null : profilePicture, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Counsellor profile not found', code: 'NOT_FOUND' });
  res.json({ profile: rows[0] });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'currentPassword is required and newPassword must be at least 8 characters', code: 'VALIDATION' });
  }
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1 AND role = \'counsellor\'', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash || ''))) {
    return res.status(401).json({ error: 'Current password is incorrect', code: 'INVALID_PASSWORD' });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
  res.json({ message: 'Password updated successfully' });
}

async function listInquiries(req, res) {
  const senior = await isSeniorCounsellor(req.user.id);
  const courseId = req.query.courseId ? parseId(req.query.courseId) : null;
  if (req.query.courseId !== undefined && !courseId) return res.status(400).json({ error: 'Invalid course id', code: 'VALIDATION' });
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (i.id) i.id, i.user_id AS "studentId", u.full_name AS "studentName", i.course_title AS "courseTitle",
            i.subject, i.message, i.reply_message AS "replyMessage", i.replied_at AS "repliedAt",
            i.replied_by AS "repliedBy", rb.full_name AS "repliedByName", i.is_read AS "isRead"
       FROM inquiries i JOIN users u ON u.id = i.user_id
       LEFT JOIN users rb ON rb.id = i.replied_by
       LEFT JOIN courses_list c ON (i.course_id IS NOT NULL AND c.id = i.course_id)
                                OR (i.course_id IS NULL AND c.title = i.course_title)
      WHERE ($1 = TRUE OR c.counsellor_id = $2)
        AND ($3::int IS NULL OR c.id = $3)
      ORDER BY i.id DESC, c.id`, [senior, req.user.id, courseId]
  );
  res.json({ inquiries: rows, isSenior: senior });
}

async function getInquiry(req, res) {
  const id = parseId(req.params.inquiryId);
  if (!id) return res.status(400).json({ error: 'Invalid inquiry id', code: 'VALIDATION' });
  const inquiry = await findAuthorizedInquiry(id, req.user.id);
  if (!inquiry) return res.status(403).json({ error: 'You are not assigned to this inquiry', code: 'FORBIDDEN' });
  res.json({ inquiry });
}

async function replyToInquiry(req, res) {
  const id = parseId(req.params.inquiryId);
  const reply = req.body?.replyMessage;
  if (!id || typeof reply !== 'string' || !reply.trim()) return res.status(400).json({ error: 'A reply is required', code: 'VALIDATION' });
  const authorizedInquiry = await findAuthorizedInquiry(id, req.user.id);
  if (!authorizedInquiry) return res.status(403).json({ error: 'You are not assigned to this inquiry', code: 'FORBIDDEN' });
  if (authorizedInquiry.replyMessage && authorizedInquiry.repliedBy !== req.user.id) {
    return res.status(403).json({ error: 'Only the counsellor who wrote the reply can edit it', code: 'FORBIDDEN' });
  }
  const { rows } = await pool.query(
    `UPDATE inquiries SET reply_message = $1, replied_at = NOW(), replied_by = $3, is_read = FALSE
      WHERE id = $2 RETURNING id, reply_message AS "replyMessage", replied_at AS "repliedAt", replied_by AS "repliedBy"`,
    [reply.trim(), id, req.user.id]
  );
  res.json({ inquiry: rows[0] });
}

async function deleteInquiryReply(req, res) {
  const id = parseId(req.params.inquiryId);
  if (!id) return res.status(400).json({ error: 'Invalid inquiry id', code: 'VALIDATION' });
  const authorizedInquiry = await findAuthorizedInquiry(id, req.user.id);
  if (!authorizedInquiry) return res.status(403).json({ error: 'You are not assigned to this inquiry', code: 'FORBIDDEN' });
  if (authorizedInquiry.repliedBy && authorizedInquiry.repliedBy !== req.user.id) {
    return res.status(403).json({ error: 'Only the counsellor who wrote the reply can delete it', code: 'FORBIDDEN' });
  }
  const { rows } = await pool.query(
    `UPDATE inquiries SET reply_message = NULL, replied_at = NULL, replied_by = NULL, is_read = FALSE
      WHERE id = $1 RETURNING id`, [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Inquiry not found', code: 'NOT_FOUND' });
  res.json({ deleted: true, id });
}

async function findNotificationInquiry(notificationId, counsellorId) {
  const { rows } = await pool.query(
    `SELECT n.id AS notification_id, i.id AS inquiry_id, i.user_id AS student_id,
            i.course_title, i.subject, i.message, i.created_at AS inquiry_created_at,
            s.full_name AS student_name, s.email AS student_email, viewer.is_senior
       FROM notifications n
       JOIN inquiries i ON i.id = n.inquiry_id
       JOIN users s ON s.id = i.user_id AND s.role = 'student'
       LEFT JOIN courses_list c ON (i.course_id IS NOT NULL AND c.id = i.course_id)
                                OR (i.course_id IS NULL AND c.title = i.course_title)
       JOIN users viewer ON viewer.id = $2 AND viewer.role = 'counsellor' AND viewer.status = 'active'
      WHERE n.id = $1
        AND ((viewer.is_senior = TRUE AND (n.target_user_id = $2 OR n.target_role = 'counsellor'))
          OR (viewer.is_senior = FALSE AND n.target_user_id = $2))
        AND (viewer.is_senior = TRUE OR c.counsellor_id = $2)`,
    [notificationId, counsellorId]
  );
  return rows[0] || null;
}

async function markOwnedNotificationRead(notificationId, counsellorId) {
  await pool.query(
    `INSERT INTO notification_reads (notification_id, user_id)
       SELECT n.id, $2 FROM notifications n
        WHERE n.id = $1 AND (n.target_user_id = $2 OR n.target_role IN ('counsellor', 'all'))
      ON CONFLICT DO NOTHING`, [notificationId, counsellorId]
  );
}

async function getNotificationDetail(req, res) {
  const notificationId = parseId(req.params.notificationId);
  if (!notificationId) return res.status(400).json({ error: 'Invalid notification id', code: 'VALIDATION' });
  const inquiry = await findNotificationInquiry(notificationId, req.user.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry notification not found', code: 'NOT_FOUND' });
  await markOwnedNotificationRead(notificationId, req.user.id);
  const { rows: replies } = await pool.query(
    `SELECT r.id, r.author_id AS "authorId", r.author_role AS "authorRole", r.body,
            r.created_at AS "createdAt", r.updated_at AS "updatedAt"
       FROM inquiry_replies r WHERE r.inquiry_id = $1 AND r.deleted_at IS NULL
      ORDER BY r.created_at ASC, r.id ASC`, [inquiry.inquiry_id]
  );
  res.json({ notification: { id: notificationId, inquiryId: inquiry.inquiry_id, read: true }, inquiry: {
    id: inquiry.inquiry_id, studentId: inquiry.student_id, studentName: inquiry.student_name,
    studentEmail: inquiry.student_email, courseTitle: inquiry.course_title, subject: inquiry.subject,
    message: inquiry.message, createdAt: inquiry.inquiry_created_at, replies,
  } });
}

function validateReplyText(value) {
  if (typeof value !== 'string' || !value.trim()) return 'replyMessage is required';
  if (value.trim().length > 4000) return 'replyMessage must be 4000 characters or fewer';
  return null;
}

async function replyToNotification(req, res) {
  const notificationId = parseId(req.params.notificationId);
  const error = validateReplyText(req.body?.replyMessage);
  if (!notificationId) return res.status(400).json({ error: 'Invalid notification id', code: 'VALIDATION' });
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });
  const inquiry = await findNotificationInquiry(notificationId, req.user.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry notification not found', code: 'NOT_FOUND' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO inquiry_replies (inquiry_id, author_id, author_role, body)
       VALUES ($1, $2, 'counsellor', $3) RETURNING id, author_id AS "authorId", author_role AS "authorRole",
       body, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [inquiry.inquiry_id, req.user.id, req.body.replyMessage.trim()]
    );
    await client.query(
      `UPDATE inquiries SET reply_message = $1, replied_at = NOW(), replied_by = $3, is_read = FALSE
        WHERE id = $2`, [req.body.replyMessage.trim(), inquiry.inquiry_id, req.user.id]
    );
    await client.query(
      `INSERT INTO notification_reads (notification_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [notificationId, req.user.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ reply: rows[0], inquiryId: inquiry.inquiry_id });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

async function editNotificationReply(req, res) {
  const notificationId = parseId(req.params.notificationId);
  const replyId = parseId(req.params.replyId);
  const error = validateReplyText(req.body?.replyMessage);
  if (!notificationId || !replyId) return res.status(400).json({ error: 'Invalid notification or reply id', code: 'VALIDATION' });
  if (error) return res.status(400).json({ error, code: 'VALIDATION' });
  const inquiry = await findNotificationInquiry(notificationId, req.user.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry notification not found', code: 'NOT_FOUND' });
  const { rows } = await pool.query(
    `UPDATE inquiry_replies SET body = $1, updated_at = NOW()
      WHERE id = $2 AND inquiry_id = $3 AND author_id = $4 AND author_role = 'counsellor' AND deleted_at IS NULL
      RETURNING id, author_id AS "authorId", author_role AS "authorRole", body, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [req.body.replyMessage.trim(), replyId, inquiry.inquiry_id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Reply not found or not owned by counsellor', code: 'NOT_FOUND' });
  await pool.query(`UPDATE inquiries SET reply_message = $1, replied_at = NOW(), replied_by = $3, is_read = FALSE WHERE id = $2`, [req.body.replyMessage.trim(), inquiry.inquiry_id, req.user.id]);
  await markOwnedNotificationRead(notificationId, req.user.id);
  res.json({ reply: rows[0], inquiryId: inquiry.inquiry_id });
}

async function deleteNotificationReply(req, res) {
  const notificationId = parseId(req.params.notificationId);
  const replyId = parseId(req.params.replyId);
  if (!notificationId || !replyId) return res.status(400).json({ error: 'Invalid notification or reply id', code: 'VALIDATION' });
  const inquiry = await findNotificationInquiry(notificationId, req.user.id);
  if (!inquiry) return res.status(404).json({ error: 'Inquiry notification not found', code: 'NOT_FOUND' });
  const { rows } = await pool.query(
    `UPDATE inquiry_replies SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND inquiry_id = $2 AND author_id = $3 AND author_role = 'counsellor' AND deleted_at IS NULL
      RETURNING body`, [replyId, inquiry.inquiry_id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Reply not found or not owned by counsellor', code: 'NOT_FOUND' });
  await pool.query(`UPDATE inquiries SET reply_message = NULL, replied_at = NULL, replied_by = NULL, is_read = FALSE WHERE id = $1 AND reply_message = $2`, [inquiry.inquiry_id, rows[0].body]);
  await markOwnedNotificationRead(notificationId, req.user.id);
  res.json({ deleted: true, id: replyId });
}

async function listNotifications(req, res) {
  const { rows } = await pool.query(
    `SELECT n.id, n.title, n.body, n.inquiry_id AS "inquiryId", n.sender_id AS "senderId", n.created_at AS "createdAt",
            i.course_title AS "courseTitle", i.replied_by AS "repliedBy", rb.full_name AS "repliedByName",
            (r.read_at IS NOT NULL) AS read
       FROM notifications n
       JOIN users viewer ON viewer.id = $1 AND viewer.role = 'counsellor' AND viewer.status = 'active'
       LEFT JOIN inquiries i ON i.id = n.inquiry_id
       LEFT JOIN users rb ON rb.id = i.replied_by
       LEFT JOIN courses_list c ON c.title = i.course_title
       LEFT JOIN notification_reads r
         ON r.notification_id = n.id AND r.user_id = $1
      WHERE (n.inquiry_id IS NULL
             AND (n.target_role IN ('all', 'counsellor') OR n.target_user_id = $1)
             AND (n.title <> 'New student inquiry' OR n.target_user_id = $1))
         OR (n.inquiry_id IS NOT NULL
             AND ((viewer.is_senior = TRUE AND (n.target_user_id = $1 OR n.target_role = 'counsellor'))
               OR (viewer.is_senior = FALSE AND n.target_user_id = $1))
             AND (viewer.is_senior = TRUE OR c.counsellor_id = $1))
      ORDER BY n.created_at DESC`, [req.user.id]
  );
  res.json({ notifications: rows, unreadCount: rows.filter((row) => !row.read).length });
}

async function markNotificationRead(req, res) {
  const id = parseId(req.params.notificationId);
  if (!id) return res.status(400).json({ error: 'Invalid notification id', code: 'VALIDATION' });
  const result = await pool.query(
    `INSERT INTO notification_reads (notification_id, user_id)
       SELECT n.id, $2 FROM notifications n
        WHERE n.id = $1 AND (n.target_role IN ('all', 'counsellor') OR n.target_user_id = $2)
      ON CONFLICT DO NOTHING RETURNING notification_id`, [id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Notification not found', code: 'NOT_FOUND' });
  res.json({ read: true, id });
}

async function markAllNotificationsRead(req, res) {
  await pool.query(
    `INSERT INTO notification_reads (notification_id, user_id)
       SELECT n.id, $1 FROM notifications n
        WHERE n.target_role IN ('all', 'counsellor') OR n.target_user_id = $1
      ON CONFLICT DO NOTHING`, [req.user.id]
  );
  res.json({ read: true });
}

async function deleteNotification(req, res) {
  const id = parseId(req.params.notificationId);
  if (!id) return res.status(400).json({ error: 'Invalid notification id', code: 'VALIDATION' });
  const result = await pool.query(
    `DELETE FROM notifications WHERE id = $1 AND target_user_id = $2 RETURNING id`, [id, req.user.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Notification not found', code: 'NOT_FOUND' });
  res.json({ deleted: true, id });
}

module.exports = {
  getDashboard,
  listStudents,
  listAssignedCourses,
  getStudentProfile,
  getGuidance,
  saveGuidance,
  updateGuidance,
  deleteGuidance,
  listGuidance,
  getGuidanceById,
  deleteGuidanceById,
  markReviewed,
  getSettings,
  updateSettings,
  getProfile,
  updateProfile,
  changePassword,
  listInquiries,
  getInquiry,
  replyToInquiry,
  deleteInquiryReply,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationDetail,
  replyToNotification,
  editNotificationReply,
  deleteNotificationReply,
};
