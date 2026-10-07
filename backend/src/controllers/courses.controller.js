const express = require('express');
const { query } = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const mapCourse = (c) => ({
  id: c.id,
  degreeName: c.degree_name,
  uniName: c.uni_name,
  alStream: c.al_stream,
  zScore: c.z_score != null ? Number(c.z_score) : null,
  minZScore: c.min_z_score != null ? Number(c.min_z_score) : null,
  islandRank: c.island_rank,
  districtRank: c.district_rank,
  district: c.district,
  intakeYear: c.intake_year,
  duration: c.duration,
  tuitionFee: c.tuition_fee,
  ugcApproved: c.ugc_approved,
  nvqLevel: c.nvq_level,
  matchPercent: c.match_percent,
  description: c.description,
  careerPath: c.career_path,
  updatedAt: c.updated_at,
});

// List courses. Optional ?stream= & ?q= filters.
async function listCourses(req, res) {
  const { stream, q } = req.query;
  const clauses = [];
  const params = [];
  if (stream) { params.push(stream); clauses.push(`al_stream = $${params.length}`); }
  if (q) { params.push(`%${q}%`); clauses.push(`(degree_name ILIKE $${params.length} OR uni_name ILIKE $${params.length})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT * FROM courses ${where} ORDER BY match_percent DESC NULLS LAST, updated_at DESC`, params
  );
  res.json({ courses: rows.map(mapCourse) });
}

// Any signed-in user.
router.get('/', authenticate, listCourses);

// Read-only catalogue for visitors (onboarding "Verified Course Database" page). No login needed.
router.get('/public', listCourses);

router.get('/:id', authenticate, async (req, res) => {
  const { rows } = await query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ message: 'Course not found.' });
  res.json({ course: mapCourse(rows[0]) });
});

// Create (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    if (!b.degreeName || !b.uniName) {
      return res.status(400).json({ message: 'Degree name and university name are required.' });
    }
    const { rows } = await query(
      `INSERT INTO courses (degree_name, uni_name, al_stream, z_score, min_z_score, island_rank, district_rank, district, intake_year, duration, tuition_fee, ugc_approved, nvq_level, match_percent, description, career_path, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [b.degreeName, b.uniName, b.alStream || null, b.zScore ?? null, b.minZScore ?? null,
       b.islandRank ?? null, b.districtRank ?? null, b.district || null, b.intakeYear ?? null,
       b.duration || null, b.tuitionFee || null, b.ugcApproved !== false, b.nvqLevel || null,
       b.matchPercent ?? null, b.description || null, b.careerPath || null, req.user.id]
    );
    res.status(201).json({ course: mapCourse(rows[0]) });
  } catch (err) {
    console.error('create course error', err);
    res.status(500).json({ message: 'Could not create course.' });
  }
});

// Update (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const b = req.body;
    const { rows } = await query(
      `UPDATE courses SET
        degree_name = COALESCE($1, degree_name),
        uni_name = COALESCE($2, uni_name),
        al_stream = $3, z_score = $4, min_z_score = $5, island_rank = $6,
        district_rank = $7, district = $8, intake_year = $9, duration = $10,
        tuition_fee = $11, ugc_approved = COALESCE($12, ugc_approved), nvq_level = $13,
        match_percent = $14, description = $15, career_path = $16, updated_at = NOW()
       WHERE id = $17 RETURNING *`,
      [b.degreeName ?? null, b.uniName ?? null, b.alStream ?? null, b.zScore ?? null, b.minZScore ?? null,
       b.islandRank ?? null, b.districtRank ?? null, b.district ?? null, b.intakeYear ?? null,
       b.duration ?? null, b.tuitionFee ?? null, b.ugcApproved ?? null, b.nvqLevel ?? null,
       b.matchPercent ?? null, b.description ?? null, b.careerPath ?? null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Course not found.' });
    res.json({ course: mapCourse(rows[0]) });
  } catch (err) {
    console.error('update course error', err);
    res.status(500).json({ message: 'Could not update course.' });
  }
});

// Delete (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { rowCount } = await query('DELETE FROM courses WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ message: 'Course not found.' });
  res.json({ message: 'Course deleted.' });
});

module.exports = router;
