UPDATE courses_list
SET counsellor_id = (
  SELECT id
  FROM users
  WHERE role = 'counsellor' AND status = 'active'
  ORDER BY id
  LIMIT 1
)
WHERE counsellor_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM users
    WHERE role = 'counsellor' AND status = 'active'
  );
