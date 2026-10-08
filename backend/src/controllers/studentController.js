const db = require('../config/db');

const DEFAULT_USER_ID = 1;

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

function parseUserId(value) {
  const userId = Number(value || DEFAULT_USER_ID);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

exports.getStudentProfile = async (req, res) => {
  try {
    const userId = parseUserId(req.query.userId);
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId must be a positive integer.' });
    }

    const userResult = await db.query(
      "SELECT id, full_name, email, al_stream, status FROM users WHERE id = $1 AND role = 'student'",
      [userId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found.' });
    }

    return res.json({
      success: true,
      user: userResult.rows[0],
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
  const userId = parseUserId(rawUserId);
  const validationError =
    !userId ? 'userId must be a positive integer.' :
    requiredString(subjectStream, 'subjectStream') ||
    requiredString(district, 'district') ||
    (zScore === undefined || zScore === null || Number.isNaN(Number(zScore))
      ? 'zScore must be a valid number.'
      : null);

  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  try {
    const result = await db.query(
      `INSERT INTO academic_profiles (user_id, subject_stream, district, z_score, subject_grades)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         subject_stream = EXCLUDED.subject_stream,
         district = EXCLUDED.district,
         z_score = EXCLUDED.z_score,
         subject_grades = EXCLUDED.subject_grades,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, subjectStream.trim(), district.trim(), Number(zScore), JSON.stringify(subjectGrades || [])]
    );
    return res.json({ success: true, message: 'Academic profile saved successfully.', data: result.rows[0] });
  } catch (error) {
    return sendServerError(res, error);
  }
};

exports.getCourses = async (req, res) => {
  const { search, stream, minZ, maxZ, universityType, ugcApproved } = req.query;
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${String(search).trim().toLowerCase()}%`);
    conditions.push(`(LOWER(title) LIKE $${params.length} OR LOWER(institute) LIKE $${params.length})`);
  }
  if (stream) {
    params.push(String(stream));
    conditions.push(`stream = $${params.length}`);
  }

  const min = minZ === undefined || minZ === '' ? null : Number(minZ);
  const max = maxZ === undefined || maxZ === '' ? null : Number(maxZ);
  if ((minZ !== undefined && Number.isNaN(min)) || (maxZ !== undefined && Number.isNaN(max))) {
    return res.status(400).json({ success: false, error: 'minZ and maxZ must be valid numbers.' });
  }
  if (min !== null) {
    params.push(min);
    conditions.push(`min_z_score >= $${params.length}`);
  }
  if (max !== null) {
    params.push(max);
    conditions.push(`min_z_score <= $${params.length}`);
  }
  if (universityType && universityType !== 'Both') {
    params.push(String(universityType));
    conditions.push(`university_type = $${params.length}`);
  }
  if (ugcApproved === 'true') {
    conditions.push('ugc_approved = true');
  }

  try {
    const query = `SELECT * FROM courses_list${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY title`;
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
    courseTitle,
    subject,
    message,
  } = req.body || {};
  const userId = parseUserId(rawUserId);
  const validationError =
    !userId ? 'userId must be a positive integer.' :
    !counsellorId ? 'counsellorId is required.' :
    requiredString(courseTitle, 'courseTitle') ||
    requiredString(subject, 'subject') ||
    requiredString(message, 'message');

  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  try {
    const counsellor = await db.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'counsellor' AND status = 'active'",
      [counsellorId]
    );
    if (counsellor.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Active counsellor not found.' });
    }

    const result = await db.query(
      `INSERT INTO inquiries (user_id, counsellor_id, course_title, subject, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, counsellorId, courseTitle.trim(), subject.trim(), message.trim()]
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

exports.getNotifications = async (req, res) => {
  const userId = parseUserId(req.query.userId);
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
  const userId = parseUserId(req.body?.userId);
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
