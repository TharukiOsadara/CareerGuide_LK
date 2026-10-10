CREATE TABLE IF NOT EXISTS student_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(150),
  grade VARCHAR(32),
  profile_picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grade is entered from Student Profile, so new and existing student accounts
-- start without a grade until the student saves one.
UPDATE users
SET grade = NULL
WHERE role = 'student';
