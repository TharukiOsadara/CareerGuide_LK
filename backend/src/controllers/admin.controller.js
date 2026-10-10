const express = require('express');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const matching = require('../services/counsellorMatching');
const v = require('../utils/validate');

// Admin views of what users are doing: counsellor <-> course assignments, which counsellor
// each student is matched to, and parent <-> child links. All routes: approved admins only.
const router = express.Router();
router.use(authenticate, requireAdmin);

const RELATIONSHIPS = ['mother', 'father', 'guardian'];
const idParam = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

// Wraps async handlers: MatchingError -> its status, anything else -> 500.
const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof matching.MatchingError) return res.status(err.status).json({ message: err.message });
    console.error('[admin api]', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

// ---------- Summary for the dashboard stat cards ----------
router.get('/summary', handle(async (req, res) => {
  const { rows } = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM users WHERE role = 'counsellor') AS counsellors,
      (SELECT COUNT(*)::int FROM users WHERE role = 'counsellor' AND status = 'active') AS active_counsellors,
      (SELECT COUNT(*)::int FROM courses_list) AS catalogue_courses,
      (SELECT COUNT(*)::int FROM courses_list c
         WHERE NOT EXISTS (SELECT 1 FROM counsellor_courses cc WHERE cc.course_id = c.id)) AS courses_without_counsellor,
      (SELECT COUNT(*)::int FROM student_course_selections) AS matched_students,
      (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS students,
      (SELECT COUNT(*)::int FROM parent_student_links) AS family_links,
      (SELECT COUNT(*)::int FROM users WHERE role = 'parent') AS parents
  `);
  const r = rows[0];
  res.json({
    counsellors: r.counsellors,
    activeCounsellors: r.active_counsellors,
    catalogueCourses: r.catalogue_courses,
    coursesWithoutCounsellor: r.courses_without_counsellor,
    matchedStudents: r.matched_students,
    students: r.students,
    familyLinks: r.family_links,
    parents: r.parents,
  });
}));

// ---------- Course catalogue (for pickers) ----------
router.get('/course-catalog', handle(async (req, res) => {
  const { rows } = await query(`
    SELECT c.id, c.title, c.institute, c.stream,
           COALESCE(json_agg(json_build_object('id', u.id, 'name', u.full_name) ORDER BY u.full_name)
             FILTER (WHERE u.id IS NOT NULL), '[]') AS counsellors
    FROM courses_list c
    LEFT JOIN counsellor_courses cc ON cc.course_id = c.id
    LEFT JOIN users u ON u.id = cc.counsellor_id
    GROUP BY c.id ORDER BY c.title`);
  res.json({ courses: rows });
}));

// ---------- Counsellors and the courses they guide ----------
router.get('/counsellors', handle(async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.full_name, u.email, u.status, u.avatar_initials, u.created_at,
           COALESCE(json_agg(DISTINCT jsonb_build_object('id', c.id, 'title', c.title, 'institute', c.institute))
             FILTER (WHERE c.id IS NOT NULL), '[]') AS courses,
           (SELECT COUNT(*)::int FROM student_course_selections s WHERE s.counsellor_id = u.id) AS student_count
    FROM users u
    LEFT JOIN counsellor_courses cc ON cc.counsellor_id = u.id
    LEFT JOIN courses_list c ON c.id = cc.course_id
    WHERE u.role = 'counsellor'
    GROUP BY u.id ORDER BY u.full_name`);
  res.json({
    counsellors: rows.map((r) => ({
      id: r.id, fullName: r.full_name, email: r.email, status: r.status,
      avatarInitials: r.avatar_initials, createdAt: r.created_at,
      courses: r.courses, studentCount: r.student_count,
    })),
  });
}));

// Replace the courses a counsellor guides.
router.put('/counsellors/:id/courses', handle(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid counsellor.' });
  const ids = req.body?.courseIds;
  if (!Array.isArray(ids)) return res.status(400).json({ message: 'courseIds must be a list.' });
  const result = await matching.setCounsellorCourses(id, ids);
  const notes = [];
  if (result.rematched) notes.push(`${result.rematched} student(s) were re-matched to another counsellor`);
  if (result.unmatched) notes.push(`${result.unmatched} student(s) lost their match because no one else guides that course`);
  res.json({ message: notes.length ? `Courses saved. ${notes.join('; ')}.` : 'Courses saved.', ...result });
}));

// ---------- Student <-> course <-> counsellor matches ----------
router.get('/selections', handle(async (req, res) => {
  const { rows } = await query(`
    SELECT s.student_id, st.full_name AS student_name, st.email AS student_email,
           s.course_id, c.title AS course_title, c.institute,
           s.counsellor_id, co.full_name AS counsellor_name, s.selected_at, s.updated_at
    FROM student_course_selections s
    JOIN users st ON st.id = s.student_id
    JOIN courses_list c ON c.id = s.course_id
    LEFT JOIN users co ON co.id = s.counsellor_id
    ORDER BY s.updated_at DESC`);
  res.json({
    selections: rows.map((r) => ({
      studentId: r.student_id, studentName: r.student_name, studentEmail: r.student_email,
      courseId: r.course_id, courseTitle: r.course_title, institute: r.institute,
      counsellorId: r.counsellor_id, counsellorName: r.counsellor_name,
      selectedAt: r.selected_at, updatedAt: r.updated_at,
    })),
  });
}));

// Students without a course choice (to create a match for them).
router.get('/unmatched-students', handle(async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.full_name, u.email, u.al_stream FROM users u
    WHERE u.role = 'student' AND NOT EXISTS (SELECT 1 FROM student_course_selections s WHERE s.student_id = u.id)
    ORDER BY u.full_name`);
  res.json({ students: rows.map((r) => ({ id: r.id, fullName: r.full_name, email: r.email, alStream: r.al_stream })) });
}));

// Create or change a student's course (and optionally pick which of its counsellors).
router.put('/selections/:studentId', handle(async (req, res) => {
  const sid = idParam(req.params.studentId);
  if (!sid) return res.status(400).json({ message: 'Invalid student.' });
  const selection = await matching.selectCourse(sid, req.body?.courseId, {
    counsellorId: idParam(req.body?.counsellorId),
  });
  res.json({ selection, message: `${selection.course.title} with ${selection.counsellor?.name || 'no counsellor'}.` });
}));

router.delete('/selections/:studentId', handle(async (req, res) => {
  const sid = idParam(req.params.studentId);
  if (!sid) return res.status(400).json({ message: 'Invalid student.' });
  const removed = await matching.clearSelection(sid);
  if (!removed) return res.status(404).json({ message: 'This student has no course match.' });
  res.json({ message: 'Course match removed.' });
}));

// ---------- Parent <-> child links ----------
const linkSelect = `
  SELECT l.id, l.parent_id, p.full_name AS parent_name, p.email AS parent_email,
         l.student_id, s.full_name AS student_name, s.email AS student_email,
         l.relationship, l.counsellor_id, c.full_name AS counsellor_name, l.created_at
  FROM parent_student_links l
  JOIN users p ON p.id = l.parent_id
  JOIN users s ON s.id = l.student_id
  LEFT JOIN users c ON c.id = l.counsellor_id`;
const toLink = (r) => ({
  id: r.id, parentId: r.parent_id, parentName: r.parent_name, parentEmail: r.parent_email,
  studentId: r.student_id, studentName: r.student_name, studentEmail: r.student_email,
  relationship: r.relationship, counsellorId: r.counsellor_id, counsellorName: r.counsellor_name,
  createdAt: r.created_at,
});

router.get('/family-links', handle(async (req, res) => {
  const { rows } = await query(`${linkSelect} ORDER BY p.full_name, s.full_name`);
  res.json({ links: rows.map(toLink) });
}));

router.post('/family-links', handle(async (req, res) => {
  const { parentEmail, studentEmail, relationship = 'guardian' } = req.body || {};
  const invalid = v.first(
    v.email(parentEmail, 'Parent email'),
    v.email(studentEmail, 'Student email'),
    RELATIONSHIPS.includes(relationship) ? '' : 'Choose mother, father or guardian.',
  );
  if (invalid) return res.status(400).json({ message: invalid });
  const parent = (await query(`SELECT id FROM users WHERE lower(email) = lower($1) AND role = 'parent'`, [parentEmail.trim()])).rows[0];
  if (!parent) return res.status(404).json({ message: 'No parent account with that email.' });
  const student = (await query(`SELECT id FROM users WHERE lower(email) = lower($1) AND role = 'student'`, [studentEmail.trim()])).rows[0];
  if (!student) return res.status(404).json({ message: 'No student account with that email.' });
  // The child's matched counsellor (if any) becomes the link's counsellor.
  const sel = (await query('SELECT counsellor_id FROM student_course_selections WHERE student_id = $1', [student.id])).rows[0];
  const ins = await query(
    `INSERT INTO parent_student_links (parent_id, student_id, relationship, counsellor_id)
     VALUES ($1, $2, $3, $4) ON CONFLICT (parent_id, student_id) DO NOTHING RETURNING id`,
    [parent.id, student.id, relationship, sel?.counsellor_id || null]
  );
  if (!ins.rows[0]) return res.status(409).json({ message: 'This parent is already linked to this student.' });
  const { rows } = await query(`${linkSelect} WHERE l.id = $1`, [ins.rows[0].id]);
  res.status(201).json({ link: toLink(rows[0]), message: 'Parent linked to student.' });
}));

router.put('/family-links/:id', handle(async (req, res) => {
  const id = idParam(req.params.id);
  const { relationship } = req.body || {};
  if (!id) return res.status(400).json({ message: 'Invalid link.' });
  if (!RELATIONSHIPS.includes(relationship)) return res.status(400).json({ message: 'Choose mother, father or guardian.' });
  const upd = await query('UPDATE parent_student_links SET relationship = $1 WHERE id = $2 RETURNING id', [relationship, id]);
  if (!upd.rows[0]) return res.status(404).json({ message: 'Link not found.' });
  const { rows } = await query(`${linkSelect} WHERE l.id = $1`, [id]);
  res.json({ link: toLink(rows[0]), message: 'Relationship updated.' });
}));

router.delete('/family-links/:id', handle(async (req, res) => {
  const id = idParam(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid link.' });
  const del = await query('DELETE FROM parent_student_links WHERE id = $1', [id]);
  if (!del.rowCount) return res.status(404).json({ message: 'Link not found.' });
  res.json({ message: 'Parent unlinked from student.' });
}));

module.exports = router;
