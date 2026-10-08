ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS reply_message TEXT,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS inquiries_unread_replies_idx
  ON inquiries (user_id, is_read, replied_at DESC)
  WHERE reply_message IS NOT NULL;
