-- Counsellor notification events. This is additive and reuses the existing
-- notifications/notification_reads tables from src/schema.sql.
BEGIN;

CREATE OR REPLACE FUNCTION notify_counsellors_for_student()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
  SELECT DISTINCT 'Student profile updated',
         'An assigned student updated their profile or academic information.',
         NEW.user_id, 'counsellor', l.counsellor_id
    FROM parent_student_links l
   WHERE l.student_id = NEW.user_id AND l.counsellor_id IS NOT NULL;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS academic_profile_counsellor_notification ON academic_profiles;
CREATE TRIGGER academic_profile_counsellor_notification
AFTER INSERT OR UPDATE ON academic_profiles
FOR EACH ROW EXECUTE FUNCTION notify_counsellors_for_student();

CREATE OR REPLACE FUNCTION notify_counsellors_for_user_profile()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
    SELECT DISTINCT 'Student profile updated', 'An assigned student updated their profile.', NEW.id, 'counsellor', l.counsellor_id
      FROM parent_student_links l
     WHERE l.student_id = NEW.id AND l.counsellor_id IS NOT NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS user_profile_counsellor_notification ON users;
CREATE TRIGGER user_profile_counsellor_notification
AFTER UPDATE OF full_name, al_stream, grade, profile_picture, z_score ON users
FOR EACH ROW EXECUTE FUNCTION notify_counsellors_for_user_profile();

CREATE OR REPLACE FUNCTION notify_counsellor_for_inquiry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.counsellor_id IS NOT NULL THEN
    INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
    VALUES ('New student inquiry', 'An assigned student sent a new course inquiry.', NEW.user_id, 'counsellor', NEW.counsellor_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS inquiry_counsellor_notification ON inquiries;
CREATE TRIGGER inquiry_counsellor_notification
AFTER INSERT ON inquiries
FOR EACH ROW EXECUTE FUNCTION notify_counsellor_for_inquiry();

CREATE OR REPLACE FUNCTION notify_student_for_counsellor_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'counsellor_guidance_records' THEN
    IF TG_OP = 'INSERT' OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
      INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
      VALUES ('New counsellor guidance', 'Your counsellor added or updated guidance for you.', NEW.counsellor_id, 'student', NEW.student_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'inquiries' AND NEW.reply_message IS NOT NULL
        AND (TG_OP = 'INSERT' OR OLD.reply_message IS DISTINCT FROM NEW.reply_message) THEN
    INSERT INTO notifications (title, body, sender_id, target_role, target_user_id)
    VALUES ('Counsellor replied', 'Your counsellor replied to your inquiry.', NEW.counsellor_id, 'student', NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guidance_student_notification ON counsellor_guidance_records;
CREATE TRIGGER guidance_student_notification
AFTER INSERT OR UPDATE ON counsellor_guidance_records
FOR EACH ROW EXECUTE FUNCTION notify_student_for_counsellor_activity();

DROP TRIGGER IF EXISTS inquiry_reply_student_notification ON inquiries;
CREATE TRIGGER inquiry_reply_student_notification
AFTER UPDATE OF reply_message ON inquiries
FOR EACH ROW EXECUTE FUNCTION notify_student_for_counsellor_activity();

COMMIT;
