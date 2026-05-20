-- CSP violation log.
--
-- Persists what `/api/csp-report` currently console.warn()s. Lets the
-- editorial desk grep recent violations to plan CSP enforcement.
CREATE TABLE IF NOT EXISTS csp_violations (
  id            SERIAL PRIMARY KEY,
  document_uri  TEXT,
  directive     TEXT,
  blocked_uri   TEXT,
  source_file   TEXT,
  line_number   INTEGER,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_created
  ON csp_violations (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_csp_violations_directive
  ON csp_violations (directive);

-- 30-day retention sketch:
--   DELETE FROM csp_violations WHERE created_at < NOW() - INTERVAL '30 days';
