const db = require('../config/db');

async function notifyInquiryCreated(inquiry) {
  const { rows: recipients } = await db.query(
    `WITH assigned AS (
       SELECT DISTINCT c.counsellor_id AS user_id,
              'New student inquiry'::text AS title
         FROM courses_list c
        WHERE (($1::int IS NOT NULL AND c.id = $1) OR ($1::int IS NULL AND c.title = $2))
          AND c.counsellor_id IS NOT NULL
     ), senior AS (
       SELECT u.id AS user_id, ('New inquiry in ' || $1)::text AS title
         FROM users u
        WHERE u.role = 'counsellor' AND u.status = 'active' AND u.is_senior = TRUE
          AND u.id NOT IN (SELECT user_id FROM assigned)
     )
     SELECT user_id, title FROM assigned
     UNION ALL
     SELECT user_id, title FROM senior`,
    [inquiry.course_id || null, inquiry.course_title]
  );
  if (!recipients.length) return { notificationsCreated: 0 };
  const values = [];
  const placeholders = recipients.map((recipient, index) => {
    const offset = index * 5;
    values.push(recipient.title, `Student inquiry for ${inquiry.course_title}`, inquiry.user_id, recipient.user_id, inquiry.id);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, 'counsellor', $${offset + 4}, $${offset + 5})`;
  });
  const result = await db.query(
    `INSERT INTO notifications (title, body, sender_id, target_role, target_user_id, inquiry_id)
     VALUES ${placeholders.join(', ')}
     ON CONFLICT DO NOTHING`, values
  );
  return { notificationsCreated: result.rowCount };
}

module.exports = { notifyInquiryCreated };
