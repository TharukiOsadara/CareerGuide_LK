const db = require('../config/db');
const matching = require('../services/counsellorMatching');

const DEFAULT_USER_ID = 42;

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({
    success: false,
    error: 'An unexpected server error occurred.',
  });
}

function requiredString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${fieldName} is required.`;
  }
  return null;
}

// When the request carries a valid login token, req.authUserId is that user's id and is
// used instead of any userId the client sends (see optionalAuth in studentRoutes.js).
function parseUserId(value) {
  const userId = Number(value || DEFAULT_USER_ID);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

exports.getStudentProfile = async (req, res) => {
  try {
    const userId = parseUserId(req.authUserId || req.query.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId must be a positive integer.' });
    }

    const userResult = await db.query(
      `SELECT u.id, u.full_name, u.email, u.al_stream, u.status,
              u.grade,
              u.profile_picture AS "profilePicture",
              ap.subject_stream AS "subjectStream",
              ap.district,
              ap.z_score AS "zScore",
              ap.subject_grades AS "subjectGrades"
       FROM users u
       LEFT JOIN academic_profiles ap ON ap.user_id = u.id
       WHERE u.id = $1 AND u.role = 'student'`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: userResult.rows[0].id,
        full_name: userResult.rows[0].full_name,
        email: userResult.rows[0].email,
        al_stream: userResult.rows[0].al_stream,
        status: userResult.rows[0].status,
        grade: userResult.rows[0].grade,
        profilePicture: userResult.rows[0].profilePicture,
      },
      academicProfile: userResult.rows[0].subjectStream
        ? {
            subjectStream: userResult.rows[0].subjectStream,
            district: userResult.rows[0].district,
            zScore: userResult.rows[0].zScore,
            subjectGrades: userResult.rows[0].subjectGrades,
          }
        : null,
      aptitude: {
        logicalReasoning: 92,
        analyticalThinking: 88,
        creativeDesign: 65,
        communication: 74,
      },
      careerPaths: [
        { rank: 1, title: 'Software Engineering', match: '96% Match', note: 'Strong logical & analytical scores' },
        { rank: 2, title: 'Data Science', match: '91% Match', note: 'High analytical + numerical aptitude' },
        { rank: 3, title: 'Computer Systems Engineering', match: '87% Match', note: 'Balanced technical profile' },
      ],
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.getCounsellors = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, full_name, email, al_stream FROM users WHERE role = 'counsellor' AND status = 'active' ORDER BY full_name"
    );
    return res.json({ success: true, counsellors: result.rows });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.saveAcademicProfile = async (req, res) => {
  const { userId: rawUserId, subjectStream, district, zScore, subjectGrades } = req.body || {};
  const userId = parseUserId(req.authUserId || rawUserId);
  const validationError =
    !userId ? 'userId must be a positive integer.' :
    requiredString(subjectStream, 'subjectStream') ||
    requiredString(district, 'district') ||
    (zScore === undefined || zScore === null || Number.isNaN(Number(zScore)) ||
      Number(zScore) < 0 || Number(zScore) > 4
      ? 'zScore must be a valid number.'
      : null);

  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO academic_profiles (user_id, subject_stream, district, z_score, subject_grades)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         subject_stream = EXCLUDED.subject_stream,
         district = EXCLUDED.district,
         z_score = EXCLUDED.z_score,
         subject_grades = EXCLUDED.subject_grades
       RETURNING *`,
      [userId, subjectStream.trim(), district.trim(), Number(zScore), JSON.stringify(subjectGrades || [])]
    );
    await client.query(
      'UPDATE users SET z_score = $1, al_stream = $2 WHERE id = $3',
      [Number(zScore), subjectStream.trim(), userId]
    );
    await client.query('COMMIT');
    return res.json({
      success: true,
      message: 'Academic profile saved successfully.',
      academicProfile: result.rows[0],
      data: result.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    return sendServerError(res, error);
  } finally {
    if (client) {
      client.release();
    }
  }
};

exports.getAcademicProfile = async (req, res) => {
  const userId = parseUserId(req.authUserId || req.params.userId);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId must be a positive integer.' });
  }
  try {
    const result = await db.query(
      `SELECT user_id AS "userId", subject_stream AS "subjectStream",
              district, z_score AS "zScore", subject_grades AS "subjectGrades"
       FROM academic_profiles WHERE user_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Academic profile not found.' });
    }
    return res.json({ success: true, academicProfile: result.rows[0], data: result.rows[0] });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.deleteAcademicProfile = async (req, res) => {
  const userId = parseUserId(req.authUserId || req.params.userId);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId must be a positive integer.' });
  }
  try {
    let client;
    try {
      client = await db.connect();
      await client.query('BEGIN');
      const result = await client.query(
        'DELETE FROM academic_profiles WHERE user_id = $1 RETURNING user_id',
        [userId]
      );
      await client.query('UPDATE users SET z_score = NULL WHERE id = $1', [userId]);
      await client.query('COMMIT');
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Academic profile not found.' });
      }
      return res.json({ success: true, message: 'Academic profile deleted successfully.' });
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.updateUserProfile = async (req, res) => {
  const userId = parseUserId(req.authUserId || req.body?.userId);
  const body = req.body || {};
  const hasName = body.fullName !== undefined || body.full_name !== undefined || body.name !== undefined;
  const hasGrade = body.grade !== undefined;
  const hasPicture = body.profilePicture !== undefined;
  const hasZScore = body.zScore !== undefined || body['Z score'] !== undefined;
  const fullName = body.fullName ?? body.full_name ?? body.name;
  const grade = body.grade;
  const profilePicture = body.profilePicture;
  const rawZScore = body.zScore ?? body['Z score'];
  const zScore = hasZScore ? Number(rawZScore) : null;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId must be a positive integer.' });
  }
  if (!hasName && !hasGrade && !hasPicture && !hasZScore) {
    return res.status(400).json({ success: false, error: 'At least one profile field is required.' });
  }
  if (hasName && (typeof fullName !== 'string' || fullName.trim() === '')) {
    return res.status(400).json({ success: false, error: 'fullName cannot be empty.' });
  }
  if (hasGrade && (typeof grade !== 'string' || grade.trim() === '')) {
    return res.status(400).json({ success: false, error: 'grade cannot be empty.' });
  }
  if (hasZScore && (!Number.isFinite(zScore) || zScore > 4 || zScore < 0)) {
    return res.status(400).json({ success: false, error: 'zScore must be between 0 and 4.' });
  }
  if (hasPicture && profilePicture !== null && typeof profilePicture !== 'string') {
    return res.status(400).json({ success: false, error: 'profilePicture must be a URL or base64 string.' });
  }

  try {
    const result = await db.query(
      `UPDATE users
       SET full_name = CASE WHEN $1 THEN $2 ELSE full_name END,
           grade = CASE WHEN $3 THEN $4 ELSE grade END,
           z_score = CASE WHEN $5 THEN $6 ELSE z_score END,
           profile_picture = CASE WHEN $7 THEN $8 ELSE profile_picture END
       WHERE id = $9
       RETURNING id, full_name, email, al_stream, grade, z_score AS "zScore",
                 profile_picture AS "profilePicture"`,
      [hasName, hasName ? fullName.trim() : null, hasGrade, hasGrade ? grade.trim() : null,
        hasZScore, zScore, hasPicture, profilePicture, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.deleteUserProfile = async (req, res) => {
  const userId = parseUserId(req.authUserId || req.params.userId);
  const fields = Array.isArray(req.body?.fields) ? req.body.fields : [];
  const allowedFields = ['grade', 'profilePicture'];
  const invalidField = fields.find((field) => !allowedFields.includes(field));
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId must be a positive integer.' });
  }
  if (fields.length === 0 || invalidField) {
    return res.status(400).json({
      success: false,
      error: 'Select one or more valid profile details to delete.',
    });
  }

  let client;
  try {
    client = await db.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE users
       SET grade = CASE WHEN $1 THEN NULL ELSE grade END,
           profile_picture = CASE WHEN $2 THEN NULL ELSE profile_picture END
       WHERE id = $3 AND role = 'student'
       RETURNING id, full_name, email, al_stream, grade, z_score AS "zScore",
                 profile_picture AS "profilePicture"`,
      [fields.includes('grade'), fields.includes('profilePicture'), userId]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }
    await client.query('COMMIT');
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    return sendServerError(res, error);
  } finally {
    if (client) {
      client.release();
    }
  }
};

exports.getCourses = async (req, res) => {
  const { search, stream, minZ, maxZ, universityType, ugcApproved } = req.query;
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${String(search).trim().toLowerCase()}%`);
    conditions.push(`(LOWER(c.title) LIKE $${params.length} OR LOWER(c.institute) LIKE $${params.length})`);
  }
  if (stream) {
    params.push(String(stream));
    conditions.push(`c.stream = $${params.length}`);
  }

  const min = minZ === undefined || minZ === '' ? null : Number(minZ);
  const max = maxZ === undefined || maxZ === '' ? null : Number(maxZ);
  if ((minZ !== undefined && Number.isNaN(min)) || (maxZ !== undefined && Number.isNaN(max))) {
    return res.status(400).json({ success: false, error: 'minZ and maxZ must be valid numbers.' });
  }
  if (min !== null) {
    params.push(min);
    conditions.push(`c.min_z_score >= $${params.length}`);
  }
  if (max !== null) {
    params.push(max);
    conditions.push(`c.min_z_score <= $${params.length}`);
  }
  if (universityType && universityType !== 'Both') {
    params.push(String(universityType));
    conditions.push(`c.university_type = $${params.length}`);
  }
  if (ugcApproved === 'true') {
    conditions.push('c.ugc_approved = true');
  }

  try {
    const query = `SELECT c.*, u.id AS counsellor_id, u.full_name AS counsellor_name
      FROM courses_list c
      LEFT JOIN users u ON c.counsellor_id = u.id
      ${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY c.title`;
    const result = await db.query(query, params);
    return res.json(result.rows);
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.getCourseDetails = async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(400).json({ success: false, error: 'Course id is required.' });
  }

  try {
    const result = await db.query('SELECT * FROM courses_list WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Course not found.' });
    }
    return res.json({ success: true, course: result.rows[0] });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.sendInquiry = async (req, res) => {
  const {
    userId: rawUserId,
    counsellorId,
    courseId,
    courseTitle,
    subject,
    message,
  } = req.body || {};
  const userId = parseUserId(req.authUserId || rawUserId);
  const validationError =
    !userId ? 'userId must be a positive integer.' :
    requiredString(courseTitle, 'courseTitle') ||
    requiredString(subject, 'subject') ||
    requiredString(message, 'message');

  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  try {
    // A student's questions go to their ONE matched counsellor. If they have not chosen a
    // course yet, asking about a course chooses it (and matches a counsellor).
    let assignedCounsellorId = null;
    const isStudent = (await db.query("SELECT 1 FROM users WHERE id = $1 AND role = 'student'", [userId])).rowCount > 0;
    if (isStudent) {
      let selection = await matching.getSelection(userId);
      if ((!selection || !selection.counsellor) && courseId) {
        try {
          selection = await matching.selectCourse(userId, courseId);
        } catch (err) {
          if (err instanceof matching.MatchingError) {
            return res.status(err.status).json({ success: false, error: err.message });
          }
          throw err;
        }
      }
      assignedCounsellorId = selection?.counsellor?.id || null;
    } else {
      assignedCounsellorId = counsellorId || null;
      if (!assignedCounsellorId && courseId) {
        const courseResult = await db.query('SELECT counsellor_id FROM courses_list WHERE id = $1', [courseId]);
        assignedCounsellorId = courseResult.rows[0]?.counsellor_id;
      }
    }
    if (!assignedCounsellorId) {
      return res.status(400).json({ success: false, error: 'No counsellor is assigned to this course.' });
    }
    const counsellor = await db.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'counsellor' AND status = 'active'",
      [assignedCounsellorId]
    );
    if (counsellor.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Active counsellor not found.' });
    }

    const result = await db.query(
      `INSERT INTO inquiries (user_id, counsellor_id, course_title, subject, message, course_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, assignedCounsellorId, courseTitle.trim(), subject.trim(), message.trim(), Number(courseId) || null]
    );
    return res.status(201).json({
      success: true,
      message: 'Inquiry sent successfully.',
      counsellorMessage: 'Your assigned counsellor has been notified and will reply shortly via the Student Portal.',
      inquiry: result.rows[0],
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// ---------- Aptitude test results (signed-in students only) ----------
// Saves the latest result so the student's parents and matched counsellor can see it.
exports.saveAptitudeResults = async (req, res) => {
  if (!req.authUserId) return res.status(401).json({ success: false, error: 'Please sign in as a student first.' });
  const { stream, scores, matches } = req.body || {};
  const clean = (list, max) => (Array.isArray(list) ? list.slice(0, max) : []);
  const okScores = clean(scores, 10).every((s) => s && typeof s.area === 'string' && Number.isFinite(Number(s.percent)));
  const okMatches = clean(matches, 5).every((m) => m && typeof m.title === 'string' && Number.isFinite(Number(m.matchPercent)));
  if (typeof stream !== 'string' || !stream.trim() || !okScores || !okMatches || !clean(matches, 5).length) {
    return res.status(400).json({ success: false, error: 'Invalid aptitude result.' });
  }
  try {
    const isStudent = (await db.query("SELECT 1 FROM users WHERE id = $1 AND role = 'student'", [req.authUserId])).rowCount > 0;
    if (!isStudent) return res.status(403).json({ success: false, error: 'Only students can save aptitude results.' });
    const toScores = clean(scores, 10).map((s) => ({ area: s.area.slice(0, 80), percent: Math.max(0, Math.min(100, Math.round(Number(s.percent)))) }));
    const toMatches = clean(matches, 5).map((m) => ({
      title: m.title.slice(0, 120),
      matchPercent: Math.max(0, Math.min(100, Math.round(Number(m.matchPercent)))),
      note: typeof m.note === 'string' ? m.note.slice(0, 300) : null,
    }));
    await db.query(
      `INSERT INTO aptitude_results (student_id, stream, scores, matches, completed_at)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())
       ON CONFLICT (student_id) DO UPDATE
         SET stream = EXCLUDED.stream, scores = EXCLUDED.scores, matches = EXCLUDED.matches, completed_at = NOW()`,
      [req.authUserId, stream.trim().slice(0, 60), JSON.stringify(toScores), JSON.stringify(toMatches)]
    );
    return res.json({ success: true });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// ---------- Course choice and matched counsellor (signed-in students only) ----------

function requireLogin(req, res) {
  if (!req.authUserId) {
    res.status(401).json({ success: false, error: 'Please sign in as a student first.' });
    return false;
  }
  return true;
}

exports.getCourseSelection = async (req, res) => {
  if (!requireLogin(req, res)) return;
  try {
    return res.json({ success: true, selection: await matching.getSelection(req.authUserId) });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.setCourseSelection = async (req, res) => {
  if (!requireLogin(req, res)) return;
  try {
    const selection = await matching.selectCourse(req.authUserId, req.body?.courseId);
    return res.json({
      success: true,
      selection,
      message: `You're matched with ${selection.counsellor?.name || 'a counsellor'} for ${selection.course.title}.`,
    });
  } catch (error) {
    if (error instanceof matching.MatchingError) {
      return res.status(error.status).json({ success: false, error: error.message });
    }
    return sendServerError(res, error);
  }
};

exports.deleteCourseSelection = async (req, res) => {
  if (!requireLogin(req, res)) return;
  try {
    await matching.clearSelection(req.authUserId);
    return res.json({ success: true, selection: null });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.getNotifications = async (req, res) => {
  const userId = parseUserId(req.authUserId || req.query.userId);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId must be a positive integer.' });
  }

  try {
    const result = await db.query(
      `SELECT
         i.id,
         i.course_title,
         i.reply_message,
         i.replied_at,
         u.full_name AS counsellor_name
       FROM inquiries i
       LEFT JOIN users u ON u.id = i.counsellor_id
       WHERE i.user_id = $1
         AND i.reply_message IS NOT NULL
         AND COALESCE(i.is_read, false) = false
       ORDER BY i.replied_at DESC NULLS LAST, i.id DESC`,
      [userId]
    );

    return res.json({
      success: true,
      unreadCount: result.rows.length,
      notifications: result.rows,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.markNotificationsRead = async (req, res) => {
  const userId = parseUserId(req.authUserId || req.body?.userId);
  const notificationIds = Array.isArray(req.body?.notificationIds)
    ? req.body.notificationIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (!userId || notificationIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'userId and at least one valid notification id are required.',
    });
  }

  try {
    const result = await db.query(
      `UPDATE inquiries
       SET is_read = true
       WHERE user_id = $1 AND id = ANY($2::int[])
       RETURNING id`,
      [userId, notificationIds]
    );
    return res.json({
      success: true,
      markedRead: result.rows.map((row) => row.id),
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};
