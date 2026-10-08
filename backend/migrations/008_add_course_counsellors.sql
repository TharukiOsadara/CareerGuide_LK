CREATE TEMP TABLE course_counsellor_assignments (
  course_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL
);

INSERT INTO course_counsellor_assignments (course_id, full_name, email)
VALUES
    (1, 'Nadeesha Perera', 'nadeesha.perera@careerguide.lk'),
    (2, 'Tharindu Fernando', 'tharindu.fernando@careerguide.lk'),
    (3, 'Hiruni Wijesinghe', 'hiruni.wijesinghe@careerguide.lk'),
    (16, 'Kasun Jayawardena', 'kasun.jayawardena@careerguide.lk'),
    (17, 'Dinithi Senanayake', 'dinithi.senanayake@careerguide.lk'),
    (18, 'Ravindu Gunathilaka', 'ravindu.gunathilaka@careerguide.lk'),
    (19, 'Sachini Herath', 'sachini.herath@careerguide.lk'),
    (20, 'Chamod Silva', 'chamod.silva@careerguide.lk'),
    (21, 'Ishara Madushani', 'ishara.madushani@careerguide.lk'),
    (22, 'Malith Rathnayake', 'malith.rathnayake@careerguide.lk'),
    (23, 'Piumi Karunaratne', 'piumi.karunaratne@careerguide.lk'),
    (24, 'Ashen Dissanayake', 'ashen.dissanayake@careerguide.lk'),
    (25, 'Yasara Ekanayake', 'yasara.ekanayake@careerguide.lk');

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
