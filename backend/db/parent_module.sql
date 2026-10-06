-- Parent View module (Jayakodi S.S.J.)
-- Safe to re-run: creates only new tables, never drops or alters existing ones.

BEGIN;

-- Which parent can see which student, and the student's assigned counsellor.
CREATE TABLE IF NOT EXISTS parent_student_links (
  id             SERIAL PRIMARY KEY,
  parent_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counsellor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  relationship   VARCHAR(20) NOT NULL DEFAULT 'guardian'
                 CHECK (relationship IN ('mother', 'father', 'guardian')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (parent_id, student_id),
  CHECK (parent_id <> student_id)
);

-- CRUD 1: parent -> counsellor inquiries.
-- Edit / delete allowed only while status = 'sent' (enforced in the API).
CREATE TABLE IF NOT EXISTS counsellor_inquiries (
  id             SERIAL PRIMARY KEY,
  parent_id      INTEGER NOT NULL,
  student_id     INTEGER NOT NULL,
  counsellor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  topic          VARCHAR(20) NOT NULL DEFAULT 'other'
                 CHECK (topic IN ('fees', 'intake_dates', 'course_choice', 'other')),
  message        TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status         VARCHAR(10) NOT NULL DEFAULT 'sent'
                 CHECK (status IN ('sent', 'read', 'answered')),
  reply          TEXT,
  replied_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (parent_id, student_id)
    REFERENCES parent_student_links (parent_id, student_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inquiries_parent_student
  ON counsellor_inquiries (parent_id, student_id, created_at DESC);

-- CRUD 2: privacy & data-sharing preferences, one row per parent + child.
-- research_share defaults to FALSE: opt-in only (FR08, NFR07, fixes DR-01).
CREATE TABLE IF NOT EXISTS privacy_preferences (
  parent_id          INTEGER NOT NULL,
  student_id         INTEGER NOT NULL,
  counsellor_access  BOOLEAN NOT NULL DEFAULT TRUE,
  parent_monitoring  BOOLEAN NOT NULL DEFAULT TRUE,
  research_share     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_id, student_id),
  FOREIGN KEY (parent_id, student_id)
    REFERENCES parent_student_links (parent_id, student_id) ON DELETE CASCADE
);

-- Audit trail behind "View Data Access History" (kept separate from the
-- shared access_logs table, whose action CHECK only allows login events).
CREATE TABLE IF NOT EXISTS parent_data_access_logs (
  id          SERIAL PRIMARY KEY,
  parent_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      VARCHAR(30) NOT NULL
              CHECK (action IN ('report_downloaded', 'privacy_created', 'privacy_updated',
                                'privacy_withdrawn', 'inquiry_created', 'inquiry_updated',
                                'inquiry_deleted')),
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_logs_student
  ON parent_data_access_logs (student_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Seed data (dev): parent 4 (Nimal Perera) -> students 2 and 3, counsellor 5.
-- Inserts only when the ids exist with the expected roles; skips duplicates.
-- ---------------------------------------------------------------------------
INSERT INTO parent_student_links (parent_id, student_id, counsellor_id, relationship)
SELECT p.id, s.id, c.id, 'father'
FROM users p
JOIN users s ON s.id IN (2, 3) AND s.role = 'student'
LEFT JOIN users c ON c.id = 5 AND c.role = 'counsellor'
WHERE p.id = 4 AND p.role = 'parent'
ON CONFLICT (parent_id, student_id) DO NOTHING;

INSERT INTO privacy_preferences (parent_id, student_id)
SELECT parent_id, student_id FROM parent_student_links WHERE parent_id = 4
ON CONFLICT (parent_id, student_id) DO NOTHING;

INSERT INTO counsellor_inquiries
  (parent_id, student_id, counsellor_id, topic, message, status, reply, replied_at,
   created_at, updated_at)
SELECT l.parent_id, l.student_id, l.counsellor_id, 'intake_dates',
       'When is the next intake for BSc (Hons) Software Engineering at state universities?',
       'answered',
       'State university intakes are usually announced after the UGC handbook release. I will share the dates once published.',
       NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
FROM parent_student_links l
WHERE l.parent_id = 4 AND l.student_id = 2
  AND NOT EXISTS (SELECT 1 FROM counsellor_inquiries WHERE parent_id = 4 AND student_id = 2);

COMMIT;
