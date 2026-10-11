ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS student_full_name VARCHAR(150);

UPDATE inquiries i
SET student_full_name = u.full_name
FROM users u
WHERE u.id = i.user_id
  AND i.student_full_name IS NULL;

CREATE INDEX IF NOT EXISTS inquiries_student_full_name_idx
  ON inquiries (student_full_name);
