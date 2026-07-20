-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 7.3 — Contract schema alignment (archived status + signing_token)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Aligns the live contracts table with the TypeScript Contract model and the
-- Contracts UI workflow (draft → sent → signed → archived, plus expired).
-- Also ensures signing_token is present for environments that never applied 7.1.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token TEXT;

-- Drop and recreate the status check so 'archived' is allowed.
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'archived', 'expired'));

CREATE UNIQUE INDEX IF NOT EXISTS contracts_signing_token_uidx
  ON contracts (signing_token)
  WHERE signing_token IS NOT NULL;
