CREATE TABLE IF NOT EXISTS academic_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_stream TEXT NOT NULL,
  district TEXT NOT NULL,
  z_score NUMERIC(4, 2) NOT NULL CHECK (z_score >= 0 AND z_score <= 4),
  subject_grades JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE academic_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'academic_profiles'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) = 'UNIQUE (user_id)'
  ) THEN
    ALTER TABLE academic_profiles
      ADD CONSTRAINT unique_user_id UNIQUE (user_id);
  END IF;
END $$;
