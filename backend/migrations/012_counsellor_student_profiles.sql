BEGIN;

-- Keep student login accounts intact while preserving removed profile details
-- for an authorized restore process. The live profile fields are cleared.
CREATE TABLE IF NOT EXISTS counsellor_student_profile_archives (
  student_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  archived_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  profile_data JSONB NOT NULL CHECK (jsonb_typeof(profile_data) = 'object'),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS counsellor_profile_audit (
  id SERIAL PRIMARY KEY,
  counsellor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  student_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('updated', 'deactivated', 'reactivated')),
  changed_fields JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(changed_fields) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counsellor_profile_audit_student
  ON counsellor_profile_audit (student_id, created_at DESC);

COMMIT;
