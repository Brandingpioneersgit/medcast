-- Hospital sameAs columns for JSON-LD.
--
-- Run via psql:
--   psql "$DATABASE_URL" -f scripts/migrations/2026-05-05-hospital-sameas.sql
--
-- `wikidata_id` is the Wikidata Q-id (e.g. "Q5783"). `wikipedia_url` is
-- the canonical en-Wikipedia page if one exists. Both surface as `sameAs`
-- entries on the Hospital JSON-LD, strengthening entity disambiguation
-- with Google.

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS wikidata_id TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS wikipedia_url TEXT;

-- Lookups: filter by hospitals that already have a Wikidata link
CREATE INDEX IF NOT EXISTS idx_hospital_wikidata
  ON hospitals (wikidata_id)
  WHERE wikidata_id IS NOT NULL;
