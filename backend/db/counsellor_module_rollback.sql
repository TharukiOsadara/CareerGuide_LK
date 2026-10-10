-- Rollback for counsellor_module.sql.
-- New counsellor tables only; do not run without approval.

BEGIN;

DROP TABLE IF EXISTS counsellor_settings;
DROP TABLE IF EXISTS counsellor_guidance_records;

COMMIT;
