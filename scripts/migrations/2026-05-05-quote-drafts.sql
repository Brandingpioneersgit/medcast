-- Quote drafts — server-side persistence so abandoned drafts can be revived
-- via emailed magic link (the localStorage version lives only in one device).
--
-- Workflow:
--   1. Quote wizard step 1 → POST /api/v1/quote-draft with whatever's filled
--   2. Server returns a `code` (HMAC-signed token) the client stores
--   3. If user finishes → quote_drafts row deleted, contact_inquiry created
--   4. If user disappears for 24h → QStash fires `/api/jobs/quote-resume`
--      → emails the user a magic-link URL `/quote?resume=<code>`

CREATE TABLE IF NOT EXISTS quote_drafts (
  id           BIGSERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,         -- random 16-char code, also the URL token
  email        TEXT,                          -- optional — only set if user provided one
  phone        TEXT,                          -- optional
  source_path  TEXT,                          -- where the draft was started
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  reminder_sent_at TIMESTAMPTZ,               -- null until QStash fires the email
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_drafts_code ON quote_drafts (code);
CREATE INDEX IF NOT EXISTS idx_quote_drafts_pending
  ON quote_drafts (created_at)
  WHERE reminder_sent_at IS NULL;

-- 60-day retention sketch (for cron):
--   DELETE FROM quote_drafts WHERE created_at < NOW() - INTERVAL '60 days';
