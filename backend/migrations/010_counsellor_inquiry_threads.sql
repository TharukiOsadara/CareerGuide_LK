-- Additive inquiry-thread support for counsellor notification replies.
BEGIN;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS inquiry_id INTEGER REFERENCES inquiries(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS inquiry_replies (
  id          SERIAL PRIMARY KEY,
  inquiry_id  INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_role VARCHAR(20) NOT NULL CHECK (author_role IN ('student', 'counsellor')),
  body        TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inquiry_replies_thread
  ON inquiry_replies (inquiry_id, created_at ASC);

INSERT INTO inquiry_replies (inquiry_id, author_id, author_role, body, created_at, updated_at)
SELECT i.id, i.counsellor_id, 'counsellor', i.reply_message,
       COALESCE(i.replied_at, i.created_at), COALESCE(i.replied_at, i.created_at)
  FROM inquiries i
 WHERE i.reply_message IS NOT NULL
   AND i.counsellor_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM inquiry_replies r
      WHERE r.inquiry_id = i.id AND r.author_role = 'counsellor'
   );

CREATE OR REPLACE FUNCTION notify_counsellor_for_inquiry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.counsellor_id IS NOT NULL THEN
    INSERT INTO notifications (title, body, sender_id, target_role, target_user_id, inquiry_id)
    VALUES ('New student inquiry', 'An assigned student sent a new course inquiry.', NEW.user_id, 'counsellor', NEW.counsellor_id, NEW.id);
  END IF;
  RETURN NEW;
END $$;

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
    INSERT INTO notifications (title, body, sender_id, target_role, target_user_id, inquiry_id)
    VALUES ('Counsellor replied', 'Your counsellor replied to your inquiry.', NEW.counsellor_id, 'student', NEW.user_id, NEW.id);
  END IF;
  RETURN NEW;
END $$;

COMMIT;
