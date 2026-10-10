ALTER TABLE academic_profiles
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);

UPDATE academic_profiles ap
SET full_name = u.full_name
FROM users u
WHERE u.id = ap.user_id
  AND ap.full_name IS NULL;
