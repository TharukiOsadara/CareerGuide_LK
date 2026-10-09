const pool = require('../db');
const { parseId } = require('../validators/counsellor.validators');
const { getQuizResults } = require('../services/studentResults');
const { name: validateName } = require('../utils/validate');

const NOT_SHARED = {
  access: 'not_shared',
  message: 'Assessment data has not been shared with this counsellor.',
};
const VALID_GRADES = new Set(['A', 'B', 'C', 'S', 'F']);

function profileError(res, status, error, code) {
  return res.status(status).json({ error, code });
}

function validateProfile(body) {
  const fields = ['fullName', 'grade', 'stream', 'district', 'zScore', 'subjectGrades'];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'A profile object is required';
  const missing = fields.find((field) => body[field] === undefined);
  if (missing) return `${missing} is required`;
  if (typeof body.fullName !== 'string') return 'fullName is invalid';
  const nameError = validateName(body.fullName, 'Student name');
  if (nameError) return nameError;
  if (typeof body.grade !== 'string' || !body.grade.trim() || body.grade.trim().length > 32) {
    return 'grade must contain 1 to 32 characters';
  }
  if (typeof body.stream !== 'string' || !body.stream.trim() || body.stream.trim().length > 60) {
    return 'stream must contain 1 to 60 characters';
  }
  if (typeof body.district !== 'string' || !body.district.trim() || body.district.trim().length > 80) {
    return 'district must contain 1 to 80 characters';
  }
  const zScore = Number(body.zScore);
  if (!Number.isFinite(zScore) || zScore < 0 || zScore > 4) return 'zScore must be between 0 and 4';
  if (!Array.isArray(body.subjectGrades) || body.subjectGrades.length !== 3) {
    return 'subjectGrades must contain exactly three subjects';
  }
  const subjects = new Set();
  for (const item of body.subjectGrades) {
    if (!item || typeof item.subject !== 'string' || !item.subject.trim() || item.subject.trim().length > 100) {
      return 'Each subject must contain 1 to 100 characters';
    }
    const subject = item.subject.trim().toLowerCase();
    if (subjects.has(subject)) return 'Subject names must be unique';
    subjects.add(subject);
    if (typeof item.grade !== 'string' || !VALID_GRADES.has(item.grade.trim().toUpperCase())) {
      return 'Subject grades must be A, B, C, S, or F';
    }
  }
  return null;
}

async function findStudent(studentId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name AS "fullName", u.email, u.grade,
            u.al_stream AS stream, u.z_score AS "zScore",
            u.profile_picture AS "profilePicture", u.avatar_initials AS initials,
            u.status AS "accountStatus",
            ap.subject_stream AS "subjectStream", ap.district,
            ap.z_score AS "academicZScore", ap.subject_grades AS "subjectGrades",
            archived.archived_at AS "profileDeactivatedAt"
       FROM users u
       LEFT JOIN academic_profiles ap ON ap.user_id = u.id
       LEFT JOIN counsellor_student_profile_archives archived
         ON archived.student_id = u.id AND archived.restored_at IS NULL
      WHERE u.id = $1 AND u.role = 'student'`, [studentId]
  );
  return rows[0] || null;
}

async function isAssignedByCourse(counsellorId, studentId) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
       SELECT 1
         FROM inquiries i
         JOIN courses_list c
           ON (i.course_id IS NOT NULL AND c.id = i.course_id)
           OR (i.course_id IS NULL AND c.title = i.course_title)
        WHERE i.user_id = $1 AND c.counsellor_id = $2
     ) AS assigned`, [studentId, counsellorId]
  );
  return rows[0]?.assigned === true;
}

async function authorizeStudent(req, res) {
  const studentId = parseId(req.params.studentId);
  if (!studentId) {
    profileError(res, 400, 'Invalid student id', 'VALIDATION');
    return null;
  }
  const student = await findStudent(studentId);
  if (!student) {
    profileError(res, 404, 'Student not found', 'NOT_FOUND');
    return null;
  }
  if (!req.user.isSenior && !(await isAssignedByCourse(req.user.id, studentId))) {
    profileError(res, 403, 'This student is not assigned to one of your courses', 'FORBIDDEN');
    return null;
  }
  return { studentId, student };
}

async function hasAssessmentConsent(counsellorId, studentId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(BOOL_OR(pp.counsellor_access), FALSE) AS allowed
       FROM parent_student_links l
       LEFT JOIN privacy_preferences pp
         ON pp.parent_id = l.parent_id AND pp.student_id = l.student_id
      WHERE l.student_id = $1 AND l.counsellor_id = $2`, [studentId, counsellorId]
  );
  return rows[0]?.allowed === true;
}

function subjectGrades(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getStudentProfile(req, res) {
  const access = await authorizeStudent(req, res);
  if (!access) return;
  const { studentId, student } = access;
  const [canViewAssessment, guidanceResult, inquiryResult] = await Promise.all([
    hasAssessmentConsent(req.user.id, studentId),
    pool.query(
      `SELECT id, assessment_summary AS "assessmentSummary",
              recommended_pathways AS "recommendedPathways", guidance_status AS "guidanceStatus",
              shared_with_parent AS "sharedWithParent", reviewed_at AS "reviewedAt",
              updated_at AS "updatedAt"
         FROM counsellor_guidance_records WHERE counsellor_id = $1 AND student_id = $2`,
      [req.user.id, studentId]
    ),
    pool.query(
      `SELECT DISTINCT i.id, i.course_title AS "courseTitle", i.subject, i.message,
              i.reply_message AS "replyMessage", i.replied_at AS "repliedAt", i.created_at AS "createdAt"
         FROM inquiries i
         LEFT JOIN courses_list c
           ON (i.course_id IS NOT NULL AND c.id = i.course_id)
           OR (i.course_id IS NULL AND c.title = i.course_title)
        WHERE i.user_id = $1 AND ($2::boolean OR c.counsellor_id = $3)
        ORDER BY i.id DESC`, [studentId, req.user.isSenior === true, req.user.id]
    ),
  ]);
  const [quiz, archiveResult] = await Promise.all([
    canViewAssessment ? getQuizResults(studentId) : Promise.resolve(null),
    pool.query(
      'SELECT EXISTS (SELECT 1 FROM counsellor_student_profile_archives WHERE student_id = $1 AND restored_at IS NULL) AS deactivated',
      [studentId]
    ),
  ]);
  const profileDeactivated = archiveResult.rows[0]?.deactivated === true;
  const guidance = guidanceResult.rows[0] || null;
  res.json({
    student: {
      id: student.id,
      name: student.fullName,
      email: student.email,
      initials: student.initials || student.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
      profilePicture: profileDeactivated ? null : student.profilePicture,
      grade: profileDeactivated ? null : student.grade,
      stream: profileDeactivated ? null : student.stream,
      indexNo: null,
      accountStatus: student.accountStatus,
      profileDeactivated,
      courseTitle: null,
      status: guidance?.guidanceStatus === 'final' && guidance.reviewedAt ? 'reviewed' : 'pending_review',
    },
    academicProfile: profileDeactivated ? null : student.subjectStream ? {
      subjectStream: student.subjectStream,
      district: student.district,
      zScore: student.academicZScore ?? student.zScore,
      subjectGrades: subjectGrades(student.subjectGrades),
    } : null,
    assessment: canViewAssessment
      ? { access: 'shared', status: quiz.status, completedAt: quiz.completedAt, scores: quiz.scores, matchedCareers: quiz.matchedCareers, source: quiz.source }
      : NOT_SHARED,
    guidance,
    inquiries: inquiryResult.rows,
    decisionSupportDisclaimer: "Assessment matches support, but do not replace, the counsellor's advice.",
  });
}

async function updateStudentProfile(req, res) {
  const access = await authorizeStudent(req, res);
  if (!access) return;
  const validationError = validateProfile(req.body);
  if (validationError) return profileError(res, 400, validationError, 'VALIDATION');

  const { studentId, student: current } = access;
  if (current.profileDeactivatedAt) {
    return profileError(res, 409, 'This profile has been deactivated and cannot be edited', 'PROFILE_DEACTIVATED');
  }
  const body = req.body;
  const clean = {
    fullName: body.fullName.trim(),
    grade: body.grade.trim(),
    stream: body.stream.trim(),
    district: body.district.trim(),
    zScore: Number(body.zScore),
    subjectGrades: body.subjectGrades.map((item) => ({ subject: item.subject.trim(), grade: item.grade.trim().toUpperCase() })),
  };
  const previousGrades = subjectGrades(current.subjectGrades);
  const changedFields = [];
  if (clean.fullName !== current.fullName) changedFields.push('fullName');
  if (clean.grade !== current.grade) changedFields.push('grade');
  if (clean.stream !== current.stream) changedFields.push('stream');
  if (clean.district !== current.district) changedFields.push('district');
  if (clean.zScore !== Number(current.academicZScore ?? current.zScore)) changedFields.push('zScore');
  if (JSON.stringify(clean.subjectGrades) !== JSON.stringify(previousGrades)) changedFields.push('subjectGrades');
  if (!changedFields.length) return res.json({ updated: false, message: 'No profile changes were made.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE users SET full_name = $1, grade = $2, al_stream = $3, z_score = $4
        WHERE id = $5 AND role = 'student'`,
      [clean.fullName, clean.grade, clean.stream, clean.zScore, studentId]
    );
    await client.query(
      `INSERT INTO academic_profiles (user_id, subject_stream, district, z_score, subject_grades)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET subject_stream = EXCLUDED.subject_stream,
         district = EXCLUDED.district, z_score = EXCLUDED.z_score,
         subject_grades = EXCLUDED.subject_grades, updated_at = NOW()`,
      [studentId, clean.stream, clean.district, clean.zScore, JSON.stringify(clean.subjectGrades)]
    );
    await client.query(
      `INSERT INTO counsellor_profile_audit (counsellor_id, student_id, action, changed_fields)
       VALUES ($1, $2, 'updated', $3::jsonb)`, [req.user.id, studentId, JSON.stringify(changedFields)]
    );
    await client.query(
      `INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
       VALUES ('Student profile updated by counsellor', 'Your counsellor updated your profile or academic details.', $1, 'student', $2)`,
      [req.user.id, studentId]
    );
    const { rows } = await client.query(
      `SELECT u.id, u.full_name AS "fullName", u.email, u.grade, u.al_stream AS stream,
              u.z_score AS "zScore", ap.subject_stream AS "subjectStream", ap.district,
              ap.z_score AS "academicZScore", ap.subject_grades AS "subjectGrades"
         FROM users u LEFT JOIN academic_profiles ap ON ap.user_id = u.id WHERE u.id = $1`, [studentId]
    );
    await client.query('COMMIT');
    const updated = rows[0];
    res.json({
      updated: true,
      student: { id: updated.id, name: updated.fullName, email: updated.email, grade: updated.grade, stream: updated.stream, indexNo: null },
      academicProfile: { subjectStream: updated.subjectStream, district: updated.district, zScore: updated.academicZScore, subjectGrades: subjectGrades(updated.subjectGrades) },
      changedFields,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deactivateStudentProfile(req, res) {
  const access = await authorizeStudent(req, res);
  if (!access) return;
  const { studentId, student } = access;
  if (student.profileDeactivatedAt) return profileError(res, 409, 'This student profile is already deactivated', 'PROFILE_DEACTIVATED');
  const archive = {
    grade: student.grade,
    stream: student.stream,
    zScore: student.zScore,
    profilePicture: student.profilePicture,
    academicProfile: student.subjectStream ? {
      subjectStream: student.subjectStream,
      district: student.district,
      zScore: student.academicZScore,
      subjectGrades: subjectGrades(student.subjectGrades),
    } : null,
  };
  const changedFields = ['grade', 'stream', 'zScore', 'profilePicture', 'academicProfile'];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO counsellor_student_profile_archives (student_id, archived_by, profile_data)
       VALUES ($1, $2, $3::jsonb)`, [studentId, req.user.id, JSON.stringify(archive)]
    );
    await client.query(
      `UPDATE users SET grade = NULL, al_stream = NULL, z_score = NULL, profile_picture = NULL
        WHERE id = $1 AND role = 'student'`, [studentId]
    );
    await client.query('DELETE FROM academic_profiles WHERE user_id = $1', [studentId]);
    await client.query(
      `INSERT INTO counsellor_profile_audit (counsellor_id, student_id, action, changed_fields)
       VALUES ($1, $2, 'deactivated', $3::jsonb)`, [req.user.id, studentId, JSON.stringify(changedFields)]
    );
    await client.query(
      `INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
       VALUES ('Student profile details removed', 'A counsellor removed optional profile and academic details. Your login account remains active.', $1, 'student', $2)`,
      [req.user.id, studentId]
    );
    await client.query('COMMIT');
    res.json({ deactivated: true, studentId, accountRemainsActive: true });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getStudentProfile, updateStudentProfile, deactivateStudentProfile };
