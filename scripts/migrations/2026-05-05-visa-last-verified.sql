-- Visa playbook editorial freshness.
--
-- `updated_at` reflects any row touch; this column reflects an editor
-- explicitly re-checking embassy URLs + processing times. Quarterly
-- re-verification is the policy.
ALTER TABLE visa_info ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE visa_info ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Backfill: assume the most recent updated_at was a verification.
UPDATE visa_info SET last_verified_at = updated_at WHERE last_verified_at IS NULL;
