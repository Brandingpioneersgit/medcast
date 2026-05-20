-- audit_log — admin action trail.
--
-- Drizzle schema (src/lib/db/schema.ts) declared this table, but it was
-- never applied to Supabase. As a result, every recordAudit() call from
-- /api/admin/* has been silently swallowed by the helper's try/catch.
--
-- Idempotent: safe to re-run.
CREATE TABLE IF NOT EXISTS audit_log (
  id           SERIAL PRIMARY KEY,
  actor        VARCHAR(255),
  action       VARCHAR(60) NOT NULL,
  entity_type  VARCHAR(40),
  entity_id    INTEGER,
  diff         TEXT,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity  ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_log (actor);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log (created_at);
