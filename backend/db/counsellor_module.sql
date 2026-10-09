-- Counsellor module migration for CareerGuide LK.
-- Additive only: does not alter existing tables or parent routes.
-- Review this file before running it against the shared Neon database.

BEGIN;

CREATE TABLE IF NOT EXISTS counsellor_guidance_records (
  id                    SERIAL PRIMARY KEY,
  counsellor_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_summary    TEXT NOT NULL DEFAULT '',
  recommended_pathways  JSONB NOT NULL DEFAULT '[]'::jsonb
                        CHECK (jsonb_typeof(recommended_pathways) = 'array'),
  guidance_status       VARCHAR(10) NOT NULL DEFAULT 'draft'
                        CHECK (guidance_status IN ('draft', 'final')),
  shared_with_parent    BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (counsellor_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_counsellor_guidance_student
  ON counsellor_guidance_records (student_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS counsellor_settings (
  counsellor_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  school_affiliation      VARCHAR(160),
  zone                    VARCHAR(160),
  notifications_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  email_alerts_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  ugc_handbook_version    VARCHAR(40),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);



COMMIT;
