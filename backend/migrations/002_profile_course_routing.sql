ALTER TABLE users
  ADD COLUMN IF NOT EXISTS z_score NUMERIC(4, 2),
  ADD COLUMN IF NOT EXISTS profile_picture TEXT;

ALTER TABLE courses_list
  ADD COLUMN IF NOT EXISTS counsellor_id INTEGER REFERENCES users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_z_score_range'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_z_score_range
      CHECK (z_score IS NULL OR (z_score >= 0 AND z_score <= 4))
      NOT VALID;
  END IF;
END $$;
