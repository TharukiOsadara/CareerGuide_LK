-- Emails match the counsellors' login accounts (firstname@gmail.com; password Firstname@1234,
-- set directly in the database). Re-running this keeps the same accounts.
CREATE TEMP TABLE course_counsellor_assignments (
  course_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL
);

INSERT INTO course_counsellor_assignments (course_id, full_name, email)
VALUES
    (1, 'Nadeesha Perera', 'nadeesha@gmail.com'),
    (2, 'Tharindu Fernando', 'tharindu@gmail.com'),
    (3, 'Hiruni Wijesinghe', 'hiruni@gmail.com'),
    (16, 'Kasun Jayawardena', 'kasun@gmail.com'),
    (17, 'Dinithi Senanayake', 'dinithi@gmail.com'),
    (18, 'Ravindu Gunathilaka', 'ravindu@gmail.com'),
    (19, 'Sachini Herath', 'sachini@gmail.com'),
    (20, 'Chamod Silva', 'chamod@gmail.com'),
    (21, 'Ishara Madushani', 'ishara@gmail.com'),
    (22, 'Malith Rathnayake', 'malith@gmail.com'),
    (23, 'Piumi Karunaratne', 'piumi@gmail.com'),
    (24, 'Ashen Dissanayake', 'ashen@gmail.com'),
    (25, 'Yasara Ekanayake', 'yasara@gmail.com');

INSERT INTO users (full_name, email, role, provider, status, admin_approved)
SELECT full_name, email, 'counsellor', 'local', 'active', true
FROM course_counsellor_assignments
ON CONFLICT (email) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = 'counsellor',
      status = 'active',
      admin_approved = true;

UPDATE courses_list AS course
SET counsellor_id = counsellor.id
FROM course_counsellor_assignments AS assignment
JOIN users AS counsellor ON counsellor.email = assignment.email
WHERE course.id = assignment.course_id;

DROP TABLE course_counsellor_assignments;
