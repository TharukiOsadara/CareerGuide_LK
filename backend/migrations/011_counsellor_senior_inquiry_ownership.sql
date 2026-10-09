-- Additive role and inquiry ownership metadata for senior counsellors.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_senior BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses_list(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replied_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_counsellor_senior_users
  ON users (role, is_senior, status);

-- Inquiry notifications are now created by the shared counsellor helper so
-- assigned and senior recipients can be de-duplicated in one place.
DROP TRIGGER IF EXISTS inquiry_counsellor_notification ON inquiries;

COMMIT;

-- Example seed (run separately after reviewing the account):
-- UPDATE users SET is_senior = TRUE
-- WHERE email = 'senior.counsellor@example.com' AND role = 'counsellor';
