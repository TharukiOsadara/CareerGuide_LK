const pool = require('../db');

async function getOverview(req, res) {
  const counsellorId = req.user.id;
  const senior = req.user.isSenior === true;
  const scopeParams = [senior, counsellorId];

  const [counsellor, stats, students, pendingInquiries, studentsWithoutGuidance, recentActivity] = await Promise.all([
    pool.query(
      `SELECT id, full_name AS name, is_senior AS "isSenior", avatar_initials AS initials
         FROM users WHERE id = $1 AND role = 'counsellor'`, [counsellorId]
    ),
    pool.query(
      `WITH student_scope AS (
         SELECT DISTINCT i.user_id AS student_id
           FROM inquiries i
           JOIN courses_list c
             ON (i.course_id IS NOT NULL AND c.id = i.course_id)
             OR (i.course_id IS NULL AND c.title = i.course_title)
          WHERE ($1::boolean OR c.counsellor_id = $2)
       )
       SELECT
         (SELECT COUNT(*)::int FROM student_scope) AS "assignedStudents",
         (SELECT COUNT(*)::int FROM inquiries i
            JOIN courses_list c
              ON (i.course_id IS NOT NULL AND c.id = i.course_id)
              OR (i.course_id IS NULL AND c.title = i.course_title)
           WHERE ($1::boolean OR c.counsellor_id = $2)
             AND i.reply_message IS NULL) AS "pendingInquiries",
         (SELECT COUNT(*)::int FROM counsellor_guidance_records
           WHERE counsellor_id = $2 AND guidance_status = 'draft') AS drafts,
         (SELECT COUNT(*)::int FROM counsellor_guidance_records
           WHERE counsellor_id = $2 AND guidance_status = 'final') AS "guidanceFinalised"`, scopeParams
    ),
    pool.query(
      `WITH student_scope AS (
         SELECT i.user_id AS student_id,
                STRING_AGG(DISTINCT c.title, ', ' ORDER BY c.title) AS "courseTitle"
           FROM inquiries i
           JOIN courses_list c
             ON (i.course_id IS NOT NULL AND c.id = i.course_id)
             OR (i.course_id IS NULL AND c.title = i.course_title)
           JOIN users u ON u.id = i.user_id AND u.role = 'student'
          WHERE ($1::boolean OR c.counsellor_id = $2)
          GROUP BY i.user_id
       )
       SELECT u.id, u.full_name AS name, u.avatar_initials AS initials, u.al_stream AS stream,
              ss."courseTitle", g.id AS "guidanceId", g.guidance_status AS "guidanceStatus",
              g.reviewed_at AS "reviewedAt",
              CASE WHEN g.guidance_status = 'final' AND g.reviewed_at IS NOT NULL THEN 'reviewed'
                   ELSE 'pending_review' END AS status
         FROM student_scope ss JOIN users u ON u.id = ss.student_id
         LEFT JOIN counsellor_guidance_records g
           ON g.student_id = u.id AND g.counsellor_id = $2
        ORDER BY u.full_name LIMIT 50`, scopeParams
    ),
    pool.query(
      `SELECT i.id, i.user_id AS "studentId", u.full_name AS "studentName",
              i.course_title AS "courseTitle", i.subject, i.created_at AS "createdAt"
         FROM inquiries i JOIN users u ON u.id = i.user_id
         JOIN courses_list c
           ON (i.course_id IS NOT NULL AND c.id = i.course_id)
           OR (i.course_id IS NULL AND c.title = i.course_title)
        WHERE ($1::boolean OR c.counsellor_id = $2) AND i.reply_message IS NULL
        ORDER BY i.created_at DESC LIMIT 5`, scopeParams
    ),
    pool.query(
      `WITH student_scope AS (
         SELECT i.user_id AS student_id,
                STRING_AGG(DISTINCT c.title, ', ' ORDER BY c.title) AS "courseTitle"
           FROM inquiries i
           JOIN courses_list c
             ON (i.course_id IS NOT NULL AND c.id = i.course_id)
             OR (i.course_id IS NULL AND c.title = i.course_title)
           JOIN users u ON u.id = i.user_id AND u.role = 'student'
          WHERE ($1::boolean OR c.counsellor_id = $2)
          GROUP BY i.user_id
       )
       SELECT u.id AS "studentId", u.full_name AS "studentName", ss."courseTitle"
         FROM student_scope ss JOIN users u ON u.id = ss.student_id
         LEFT JOIN counsellor_guidance_records g
           ON g.student_id = u.id AND g.counsellor_id = $2
        WHERE g.id IS NULL ORDER BY u.full_name LIMIT 5`, scopeParams
    ),
    pool.query(
      `SELECT activity.type, activity.description, activity."studentName", activity."createdAt"
         FROM (
           SELECT 'guidance' AS type,
                  CASE WHEN g.guidance_status = 'final' THEN 'Finalised guidance' ELSE 'Updated guidance draft' END AS description,
                  s.full_name AS "studentName", g.updated_at AS "createdAt"
             FROM counsellor_guidance_records g JOIN users s ON s.id = g.student_id
            WHERE g.counsellor_id = $1
           UNION ALL
           SELECT 'profile' AS type,
                  CASE WHEN a.action = 'deactivated' THEN 'Removed profile details' ELSE 'Updated student profile' END AS description,
                  s.full_name AS "studentName", a.created_at AS "createdAt"
             FROM counsellor_profile_audit a JOIN users s ON s.id = a.student_id
            WHERE a.counsellor_id = $1
           UNION ALL
           SELECT 'inquiry' AS type, 'Replied to a student inquiry' AS description,
                  s.full_name AS "studentName", i.replied_at AS "createdAt"
             FROM inquiries i JOIN users s ON s.id = i.user_id
            WHERE i.replied_by = $1 AND i.replied_at IS NOT NULL
         ) activity ORDER BY activity."createdAt" DESC LIMIT 8`, [counsellorId]
    ),
  ]);

  res.json({
    counsellor: counsellor.rows[0] || { id: counsellorId, name: req.user.fullName, isSenior: senior },
    stats: stats.rows[0],
    students: students.rows,
    needsAttention: [
      ...pendingInquiries.rows.map((item) => ({ ...item, type: 'inquiry', title: item.subject || 'Unanswered inquiry' })),
      ...studentsWithoutGuidance.rows.map((item) => ({ ...item, type: 'student', title: item.studentName, subject: 'No guidance recorded' })),
    ],
    recentActivity: recentActivity.rows,
  });
}

module.exports = { getOverview };
