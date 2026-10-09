const pool = require('../db');

// Counsellor <-> course matching.
//  - counsellor_courses: which courses each counsellor guides (picked at sign-up, editable by admins).
//  - student_course_selections: the course a student chose and the ONE counsellor matched to them.
// Only the matched counsellor can see and guide the student (see counsellor.controller).

class MatchingError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const toInt = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// The active counsellor for a course with the fewest matched students (spreads the load).
async function matchCounsellorForCourse(courseId, client = pool) {
  const { rows } = await client.query(
    `SELECT cc.counsellor_id, COUNT(s.student_id)::int AS load
     FROM counsellor_courses cc
     JOIN users u ON u.id = cc.counsellor_id AND u.role = 'counsellor' AND u.status = 'active'
     LEFT JOIN student_course_selections s ON s.counsellor_id = cc.counsellor_id
     WHERE cc.course_id = $1
     GROUP BY cc.counsellor_id
     ORDER BY load ASC, cc.counsellor_id ASC
     LIMIT 1`,
    [courseId]
  );
  if (rows[0]) return rows[0].counsellor_id;
  // Fallback: the course's primary counsellor, if still active.
  const fallback = await client.query(
    `SELECT c.counsellor_id FROM courses_list c
     JOIN users u ON u.id = c.counsellor_id AND u.role = 'counsellor' AND u.status = 'active'
     WHERE c.id = $1`,
    [courseId]
  );
  return fallback.rows[0]?.counsellor_id || null;
}

async function getSelection(studentId, client = pool) {
  const { rows } = await client.query(
    `SELECT s.student_id, s.course_id, s.counsellor_id, s.selected_at, s.updated_at,
            c.title AS course_title, c.institute, c.stream,
            u.full_name AS counsellor_name, u.email AS counsellor_email
     FROM student_course_selections s
     JOIN courses_list c ON c.id = s.course_id
     LEFT JOIN users u ON u.id = s.counsellor_id
     WHERE s.student_id = $1`,
    [studentId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    studentId: r.student_id,
    course: { id: r.course_id, title: r.course_title, institute: r.institute, stream: r.stream },
    counsellor: r.counsellor_id ? { id: r.counsellor_id, name: r.counsellor_name, email: r.counsellor_email } : null,
    selectedAt: r.selected_at,
    updatedAt: r.updated_at,
  };
}

// Student chooses a course: match a counsellor and remember it.
// Keeps the parent module's "child's counsellor" (parent_student_links) in step.
// `counsellorId` lets an admin pick a specific counsellor (must guide that course).
async function selectCourse(studentId, courseId, { counsellorId = null } = {}) {
  const sid = toInt(studentId);
  const cid = toInt(courseId);
  if (!sid) throw new MatchingError('Invalid student.');
  if (!cid) throw new MatchingError('Choose a valid course.');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const student = await client.query(`SELECT id FROM users WHERE id = $1 AND role = 'student'`, [sid]);
    if (!student.rows[0]) throw new MatchingError('Only student accounts can choose a course.', 403);
    const course = await client.query('SELECT id FROM courses_list WHERE id = $1', [cid]);
    if (!course.rows[0]) throw new MatchingError('Course not found.', 404);

    let chosen = null;
    if (counsellorId) {
      const ok = await client.query(
        `SELECT 1 FROM counsellor_courses cc
         JOIN users u ON u.id = cc.counsellor_id AND u.role = 'counsellor' AND u.status = 'active'
         WHERE cc.counsellor_id = $1 AND cc.course_id = $2`,
        [counsellorId, cid]
      );
      if (!ok.rows[0]) throw new MatchingError('That counsellor does not guide this course.');
      chosen = Number(counsellorId);
    } else {
      // Same course as before and that counsellor still guides it: keep the same counsellor.
      const current = await client.query(
        `SELECT s.counsellor_id FROM student_course_selections s
         JOIN counsellor_courses cc ON cc.counsellor_id = s.counsellor_id AND cc.course_id = s.course_id
         JOIN users u ON u.id = s.counsellor_id AND u.status = 'active'
         WHERE s.student_id = $1 AND s.course_id = $2`,
        [sid, cid]
      );
      chosen = current.rows[0]?.counsellor_id || (await matchCounsellorForCourse(cid, client));
    }
    if (!chosen) throw new MatchingError('No counsellor guides this course yet. Please choose another course or try later.', 409);

    await client.query(
      `INSERT INTO student_course_selections (student_id, course_id, counsellor_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id) DO UPDATE
         SET course_id = EXCLUDED.course_id, counsellor_id = EXCLUDED.counsellor_id, updated_at = NOW()`,
      [sid, cid, chosen]
    );
    await client.query('UPDATE parent_student_links SET counsellor_id = $1 WHERE student_id = $2', [chosen, sid]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getSelection(sid);
}

async function clearSelection(studentId) {
  const sid = toInt(studentId);
  if (!sid) throw new MatchingError('Invalid student.');
  const { rowCount } = await pool.query('DELETE FROM student_course_selections WHERE student_id = $1', [sid]);
  return rowCount > 0;
}

// Keep courses_list.counsellor_id (shown on course cards) pointing at a counsellor who guides it.
async function syncPrimaryCounsellors(client = pool) {
  await client.query(
    `UPDATE courses_list c
     SET counsellor_id = (
       SELECT cc.counsellor_id FROM counsellor_courses cc
       JOIN users u ON u.id = cc.counsellor_id AND u.status = 'active'
       WHERE cc.course_id = c.id ORDER BY cc.created_at, cc.counsellor_id LIMIT 1)
     WHERE c.counsellor_id IS NULL
        OR NOT EXISTS (SELECT 1 FROM counsellor_courses cc WHERE cc.course_id = c.id AND cc.counsellor_id = c.counsellor_id)`
  );
}

// Replace the set of courses a counsellor guides. Students matched to this counsellor on a
// course they no longer guide are re-matched to another counsellor for that course.
async function setCounsellorCourses(counsellorId, courseIds) {
  const id = toInt(counsellorId);
  const ids = [...new Set((courseIds || []).map(toInt).filter(Boolean))];
  const client = await pool.connect();
  let orphaned = [];
  try {
    await client.query('BEGIN');
    const c = await client.query(`SELECT id FROM users WHERE id = $1 AND role = 'counsellor'`, [id]);
    if (!c.rows[0]) throw new MatchingError('Counsellor not found.', 404);
    if (ids.length) {
      const found = await client.query('SELECT id FROM courses_list WHERE id = ANY($1::int[])', [ids]);
      if (found.rowCount !== ids.length) throw new MatchingError('One or more courses do not exist.');
    }
    await client.query(
      'DELETE FROM counsellor_courses WHERE counsellor_id = $1 AND NOT (course_id = ANY($2::int[]))',
      [id, ids]
    );
    for (const courseId of ids) {
      await client.query(
        'INSERT INTO counsellor_courses (counsellor_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, courseId]
      );
    }
    const gone = await client.query(
      `SELECT student_id, course_id FROM student_course_selections
       WHERE counsellor_id = $1 AND NOT (course_id = ANY($2::int[]))`,
      [id, ids]
    );
    orphaned = gone.rows;
    await syncPrimaryCounsellors(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  // Re-match students who lost their counsellor for their course (outside the transaction).
  let rematched = 0;
  let unmatched = 0;
  for (const row of orphaned) {
    try { await selectCourse(row.student_id, row.course_id); rematched += 1; } catch { await clearSelection(row.student_id); unmatched += 1; }
  }
  return { courseIds: ids, rematched, unmatched };
}

module.exports = {
  MatchingError,
  matchCounsellorForCourse,
  getSelection,
  selectCourse,
  clearSelection,
  setCounsellorCourses,
  syncPrimaryCounsellors,
};
