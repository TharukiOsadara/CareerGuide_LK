// Applies schema.sql and seeds the super admin + sample data.
// Run with:  node backend/src/initDb.js   (or npm run db:init from the root)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');
const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = require('./config/env');

const initials = (name) =>
  name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const parentSchema = fs.readFileSync(path.join(__dirname, '..', 'db', 'parent_module.sql'), 'utf8');
  const counsellorSchema = fs.readFileSync(path.join(__dirname, '..', 'db', 'counsellor_module.sql'), 'utf8');
  const studentSchema = fs.readFileSync(path.join(__dirname, '..', 'db', 'student_module.sql'), 'utf8');
  console.log('Applying schema...');
  await pool.query(schema);
  await pool.query(parentSchema);
  await pool.query(counsellorSchema);
  await pool.query(studentSchema);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS admin_rejected BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS z_score NUMERIC(5, 4)
  `);
  // Admin two-factor sign-in (authenticator app codes).
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(64),
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS totp_failed INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS totp_last_step BIGINT,
    ADD COLUMN IF NOT EXISTS totp_locked_until TIMESTAMPTZ
  `);
  // Password reset: wrong-code counter for the emailed 6-digit code.
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_attempts INTEGER NOT NULL DEFAULT 0
  `);
  // Google sign-in data, and whether a Google user has finished their profile.
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS google_given_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS google_family_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS google_locale VARCHAR(20),
    ADD COLUMN IF NOT EXISTS google_linked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS google_last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT TRUE
  `);

  // Seed the primary (super) admin.
  const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, status, admin_approved, is_super_admin, avatar_initials, profile_completion)
     VALUES ($1, $2, $3, 'admin', 'active', TRUE, TRUE, $4, 100)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash,
       is_super_admin = TRUE, admin_approved = TRUE, status = 'active'`,
    ['Tharuki Admin', SUPER_ADMIN_EMAIL.toLowerCase(), hash, 'TA']
  );
  console.log(`Super admin ready: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}`);

  // Seed a couple of demo student/parent/counsellor accounts (password: Test@1234).
  const demoHash = await bcrypt.hash('Test@1234', 10);
  const demos = [
    ['Tharuki Perera', 'tharuki@student.lk', 'student', 'Physical Science (Maths)'],
    ['Savindi Fernando', 'savindi@gmail.com', 'student', 'Biological Science'],
    ['Nimal Perera', 'parent@careerguide.lk', 'parent', null],
    ['Ms. Silva', 'counsellor@careerguide.lk', 'counsellor', null],
  ];
  for (const [name, email, role, stream] of demos) {
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, al_stream, avatar_initials, profile_completion, status, admin_approved)
       VALUES ($1, $2, $3, $4, $5, $6, 65, 'active', TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [name, email, demoHash, role, stream, initials(name)]
    );
  }

  // Seed sample courses.
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM courses');
  if (rows[0].c === 0) {
    const courses = [
      ['B.Sc. (Hons) in Software Engineering', 'IIT / University of Westminster', 'Physical Science (Maths)', 1.8542, 1.75, 42, 5, '4 Years', 'Rs. 1,250,000', true, 'NVQ Level 6', 94,
        'A professionally accredited degree covering full-stack development, software architecture, and agile delivery.',
        'Software Engineer, Full-Stack Developer, DevOps Engineer, Solutions Architect — avg. entry salary Rs. 120,000+/month.'],
      ['B.Sc. (Hons) in Biomedical Science', 'AIC Campus', 'Biological Science', 1.7210, 1.65, 88, 11, '3 Years', 'Rs. 980,000', true, 'NVQ Level 6', 87,
        'Study of human biology, diagnostics and laboratory science aligned with healthcare industry needs.',
        'Biomedical Scientist, Lab Analyst, Research Associate, Clinical Officer.'],
      ['B.Sc. in Computer Science', 'University of Colombo', 'Physical Science (Maths)', 1.9021, 1.88, 12, 2, '4 Years', 'Government Funded', true, 'NVQ Level 6', 91,
        'Core computer science with algorithms, AI and data systems at a UGC state university.',
        'Data Scientist, ML Engineer, Backend Developer, Systems Analyst.'],
      ['B.B.A. in Business Analytics', 'NSBM Green University', 'Commerce', 1.4500, 1.40, 150, 18, '4 Years', 'Rs. 1,100,000', true, 'NVQ Level 6', 82,
        'Blends management with data-driven decision making and business intelligence tooling.',
        'Business Analyst, BI Consultant, Product Manager, Operations Analyst.'],
    ];
    for (const c of courses) {
      await pool.query(
        `INSERT INTO courses (degree_name, uni_name, al_stream, z_score, min_z_score, island_rank, district_rank, duration, tuition_fee, ugc_approved, nvq_level, match_percent, description, career_path)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        c
      );
    }
    console.log(`Seeded ${courses.length} courses.`);
  }

  const signupCourses = [
    ['B.Sc. (Hons) Software Engineering', 'CareerGuide Catalogue', 'Physical Science (Maths)'],
    ['B.Sc. (Hons) Biomedical Science', 'CareerGuide Catalogue', 'Biological Science'],
    ['BSc (Hons) Data Science & AI', 'CareerGuide Catalogue', 'Physical Science (Maths)'],
    ['B.Sc. (Hons) Information Technology', 'CareerGuide Catalogue', 'Technology'],
    ['Bachelor of Information Technology', 'CareerGuide Catalogue', 'Technology'],
    ['MBBS (Medicine & Surgery)', 'CareerGuide Catalogue', 'Biological Science'],
    ['(Hons) Business Management', 'CareerGuide Catalogue', 'Commerce'],
    ['B.B.A. (Hons) Marketing', 'CareerGuide Catalogue', 'Commerce'],
    ['B.Com (Hons) Accounting & Finance', 'CareerGuide Catalogue', 'Commerce'],
    ['B.A. (Hons) International Relations', 'CareerGuide Catalogue', 'Arts'],
    ['B.Sc. (Hons) Mechanical Engineering', 'CareerGuide Catalogue', 'Physical Science (Maths)'],
  ];
  for (const [title, institute, stream] of signupCourses) {
    await pool.query(
      `INSERT INTO courses_list (title, institute, stream)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM courses_list WHERE lower(title) = lower($1::varchar))`,
      [title, institute, stream]
    );
  }

  // Ensure every catalogue course can be selected by a student. Existing
  // counsellor choices are preserved; only courses with no active guide are
  // assigned, distributing them across the active counsellors.
  await pool.query(`
    WITH active_counsellors AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS position,
             COUNT(*) OVER () AS total
      FROM users
      WHERE role = 'counsellor' AND status = 'active'
    ),
    unassigned_courses AS (
      SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.id) - 1 AS position
      FROM courses_list c
      WHERE NOT EXISTS (
        SELECT 1
        FROM counsellor_courses cc
        JOIN users u ON u.id = cc.counsellor_id
        WHERE cc.course_id = c.id
          AND u.role = 'counsellor'
          AND u.status = 'active'
      )
    )
    INSERT INTO counsellor_courses (counsellor_id, course_id)
    SELECT counsellor.id, course.id
    FROM unassigned_courses course
    JOIN active_counsellors counsellor
      ON counsellor.position = MOD(course.position, counsellor.total)
    ON CONFLICT DO NOTHING
  `);

  await pool.query(`
    UPDATE courses_list c
    SET counsellor_id = (
      SELECT cc.counsellor_id
      FROM counsellor_courses cc
      JOIN users u ON u.id = cc.counsellor_id
      WHERE cc.course_id = c.id
        AND u.role = 'counsellor'
        AND u.status = 'active'
      ORDER BY cc.created_at, cc.counsellor_id
      LIMIT 1
    )
    WHERE c.counsellor_id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM counsellor_courses cc
         JOIN users u ON u.id = cc.counsellor_id
         WHERE cc.course_id = c.id
           AND cc.counsellor_id = c.counsellor_id
           AND u.role = 'counsellor'
           AND u.status = 'active'
       )
  `);

  console.log('Database init complete.');
  await pool.end();
}

run().catch((err) => {
  console.error('DB init failed:', err);
  process.exit(1);
});
