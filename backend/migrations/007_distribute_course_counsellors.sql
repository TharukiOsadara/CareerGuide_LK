WITH active_counsellors AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS counsellor_number,
         COUNT(*) OVER () AS counsellor_count
  FROM users
  WHERE role = 'counsellor' AND status = 'active'
),
numbered_courses AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS course_number
  FROM courses_list
)
UPDATE courses_list AS course
SET counsellor_id = counsellor.id
FROM numbered_courses AS numbered
JOIN active_counsellors AS counsellor
  ON counsellor.counsellor_number =
     ((numbered.course_number - 1) % counsellor.counsellor_count) + 1
WHERE course.id = numbered.id;
