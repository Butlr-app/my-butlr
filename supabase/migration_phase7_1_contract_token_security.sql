-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 7.1 — Contract signing token security (close public enumeration leak)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Problem: the public contract-signing flow relied on table-level RLS policies
--   "Public read contracts by token"      USING (signing_token IS NOT NULL)
--   "Public update contract status"        USING (signing_token IS NOT NULL)
--   plus fully-open contract_signatures policies (USING true).
-- Because RLS predicates are OR-ed, ANY visitor (even anon) could
--   SELECT * FROM contracts;            -- enumerate every contract that has a token
--   UPDATE contracts SET ...;           -- tamper with any contract that has a token
--   INSERT INTO contract_signatures ... -- forge signatures for any contract
-- The signing_token was meant to be a *secret capability*, but the policy only
-- checked that a token EXISTS, not that the caller knows it.
--
-- Fix: remove the broad public policies and expose the signing flow through two
-- SECURITY DEFINER RPCs that require the exact token. The token now behaves as a
-- real bearer capability (no enumeration, no tampering, no forged signatures).
-- ═══════════════════════════════════════════════════════════════════════════════

-- Safety: ensure the column exists (present in the live DB, absent from schema.sql)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token TEXT;

-- ─── 1. Drop the leaky public policies ──────────────────────────────────────────
DROP POLICY IF EXISTS "Public read contracts by token" ON contracts;
DROP POLICY IF EXISTS "Public update contract status" ON contracts;
DROP POLICY IF EXISTS "Public sign contract_signatures" ON contract_signatures;
DROP POLICY IF EXISTS "Public read contract_signatures by token" ON contract_signatures;
DROP POLICY IF EXISTS "Public insert contract_signatures" ON contract_signatures;

-- ─── 2. Capability read: return only the row whose token matches exactly ────────
CREATE OR REPLACE FUNCTION public.get_contract_by_token(p_token TEXT)
RETURNS SETOF contracts
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT *
  FROM contracts
  WHERE p_token IS NOT NULL
    AND length(p_token) >= 16
    AND signing_token = p_token
  LIMIT 1;
$$;

-- ─── 3. Capability sign: validate token, record signature, mark signed ──────────
CREATE OR REPLACE FUNCTION public.sign_contract_by_token(
  p_token          TEXT,
  p_signer_name    TEXT,
  p_signer_role    TEXT,
  p_signature_data TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract contracts%ROWTYPE;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 THEN
    RAISE EXCEPTION 'Invalid signing link';
  END IF;
  IF coalesce(btrim(p_signer_name), '') = ''
     OR coalesce(btrim(p_signer_role), '') = ''
     OR coalesce(p_signature_data, '') = '' THEN
    RAISE EXCEPTION 'Name, role and signature are required';
  END IF;

  SELECT * INTO v_contract
  FROM contracts
  WHERE signing_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid signing link';
  END IF;
  IF v_contract.status IN ('signed', 'archived') THEN
    RAISE EXCEPTION 'Contract already signed';
  END IF;

  INSERT INTO contract_signatures (contract_id, signer_name, signer_role, signature_data, signed_at)
  VALUES (v_contract.id, p_signer_name, p_signer_role, p_signature_data, now());

  UPDATE contracts SET status = 'signed' WHERE id = v_contract.id;

  -- Notify owners only — never a user_id IS NULL broadcast (readable by everyone).
  INSERT INTO notifications (user_id, type, title, message, read, data)
  SELECT pr.id,
         'system',
         'Contract signed',
         p_signer_name || ' signed the contract for ' || v_contract.guest_name,
         false,
         jsonb_build_object('contract_id', v_contract.id)
  FROM profiles pr
  WHERE pr.role = 'owner';
END;
$$;

-- ─── 4. Grants: only these two RPCs are exposed to the public signing page ───────
REVOKE ALL ON FUNCTION public.get_contract_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_contract_by_token(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_by_token(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
