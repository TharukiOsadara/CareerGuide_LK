-- Student features + counsellor/course matching.
-- Safe to run repeatedly (initDb.js runs it on every setup). Matches the tables the
-- student screens and migrations/*.sql already use, so a fresh database works too.

-- Course catalogue used by the student course screens and counsellor matching.
CREATE TABLE IF NOT EXISTS courses_list (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(150) NOT NULL,
  institute        VARCHAR(100) NOT NULL,
  stream           VARCHAR(50)  NOT NULL,
  ugc_approved     BOOLEAN DEFAULT TRUE,
  nvq_level        VARCHAR(20)  DEFAULT 'NVQ Level 7',
  match_percentage INTEGER      DEFAULT 85,
  min_z_score      NUMERIC(5,4) DEFAULT 1.5000,
  max_z_score      NUMERIC(5,4) DEFAULT 3.0000,
  university_type  VARCHAR(20)  DEFAULT 'Government',
  duration         VARCHAR(50)  DEFAULT '4 Years',
  intake           VARCHAR(50)  DEFAULT 'Feb & Sept',
  estimated_fee    VARCHAR(50)  DEFAULT 'LKR 2.4M',
  industry_demand  VARCHAR(50)  DEFAULT '94% HIGH INDUSTRY DEMAND',
  salary_range     VARCHAR(100) DEFAULT 'LKR 150,000 - 250,000/mo',
  hiring_partners  TEXT         DEFAULT 'Virtusa, Sysco LABS, WSO2',
  -- Primary counsellor shown on the course (kept in sync with counsellor_courses).
  counsellor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Student questions to a course's counsellor (and the counsellor's reply).
CREATE TABLE IF NOT EXISTS inquiries (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  counsellor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  course_title  VARCHAR(150),
  subject       VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  reply_message TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  replied_at    TIMESTAMPTZ,
  course_id     INTEGER REFERENCES courses_list(id) ON DELETE SET NULL,
  replied_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Academic profile (stream, district, Z-score, subject grades) per student.
CREATE TABLE IF NOT EXISTS academic_profiles (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  subject_stream TEXT NOT NULL,
  district       TEXT NOT NULL,
  z_score        NUMERIC(4, 2) NOT NULL CHECK (z_score >= 0 AND z_score <= 4),
  subject_grades JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Extra profile fields used by the student profile screens.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS grade VARCHAR(32),
  ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Which counsellors guide which courses (a counsellor picks these at sign-up; admins can edit).
CREATE TABLE IF NOT EXISTS counsellor_courses (
  counsellor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES courses_list(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (counsellor_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_counsellor_courses_course ON counsellor_courses(course_id);

-- Keep existing course -> counsellor assignments.
INSERT INTO counsellor_courses (counsellor_id, course_id)
SELECT c.counsellor_id, c.id
FROM courses_list c
JOIN users u ON u.id = c.counsellor_id AND u.role = 'counsellor'
WHERE c.counsellor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- The course a student chose, and the ONE counsellor matched to them for it.
-- Only that counsellor can see and guide the student.
CREATE TABLE IF NOT EXISTS student_course_selections (
  student_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  course_id     INTEGER NOT NULL REFERENCES courses_list(id) ON DELETE CASCADE,
  counsellor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  selected_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_selections_counsellor ON student_course_selections(counsellor_id);

-- Latest aptitude test result per student (from the app's Quiz tab). Shown to the student's
-- parents and matched counsellor (subject to the parent's privacy choices).
CREATE TABLE IF NOT EXISTS aptitude_results (
  student_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stream       VARCHAR(60) NOT NULL,
  scores       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ area, percent }] for every career in the set
  matches      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ title, matchPercent, note }] top matches
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
