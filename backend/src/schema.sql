-- CareerGuide LK database schema (PostgreSQL / Neon)

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  full_name       VARCHAR(150) NOT NULL,
  email           VARCHAR(190) UNIQUE NOT NULL,
  password_hash   VARCHAR(255),
  role            VARCHAR(20) NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'parent', 'counsellor', 'admin')),
  al_stream       VARCHAR(60),
  provider        VARCHAR(20) NOT NULL DEFAULT 'local'
                    CHECK (provider IN ('local', 'google')),
  google_id       VARCHAR(120),
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'locked', 'blocked', 'pending')),
  admin_approved  BOOLEAN NOT NULL DEFAULT TRUE,
  admin_rejected  BOOLEAN NOT NULL DEFAULT FALSE,
  is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
  profile_completion INTEGER NOT NULL DEFAULT 40,
  avatar_initials VARCHAR(4),
  reset_token     VARCHAR(120),
  reset_expires   TIMESTAMPTZ,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id             SERIAL PRIMARY KEY,
  degree_name    VARCHAR(200) NOT NULL,
  uni_name       VARCHAR(200) NOT NULL,
  al_stream      VARCHAR(60),
  z_score        NUMERIC(5, 4),
  min_z_score    NUMERIC(5, 4),
  island_rank    INTEGER,
  district_rank  INTEGER,
  district       VARCHAR(80),
  intake_year    INTEGER,
  duration       VARCHAR(60),
  tuition_fee    VARCHAR(80),
  ugc_approved   BOOLEAN NOT NULL DEFAULT TRUE,
  nvq_level      VARCHAR(40),
  match_percent  INTEGER,
  description    TEXT,
  career_path    TEXT,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  body           TEXT NOT NULL,
  sender_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target_role    VARCHAR(20) NOT NULL DEFAULT 'all'
                    CHECK (target_role IN ('student', 'parent', 'counsellor', 'admin', 'all')),
  target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-user read receipts so the red dot clears per account.
CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS access_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(150),
  role        VARCHAR(20),
  action      VARCHAR(30) NOT NULL
                CHECK (action IN ('login', 'logout', 'failed_login')),
  ip_address  VARCHAR(60),
  device      VARCHAR(120),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_name   VARCHAR(150),
  role        VARCHAR(20),
  ip_address  VARCHAR(60),
  device      VARCHAR(120),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  admin_id            INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  login_notifications BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_role, target_user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_courses_stream ON courses(al_stream);
