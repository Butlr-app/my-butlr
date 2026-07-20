-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 7.4 — Contract legal loop: expiry, proof, reservation sync, templates RLS
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Extra columns on contracts ───────────────────────────────────────────
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_token TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signing_expires_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signer_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS document_hash TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signature_hash TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_version TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_snapshot JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_signing_token_uidx
  ON contracts (signing_token)
  WHERE signing_token IS NOT NULL;

-- ─── 2. Sync reservations.contract_status whenever a linked contract changes ─
CREATE OR REPLACE FUNCTION public.sync_reservation_contract_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rid UUID;
  v_status TEXT;
BEGIN
  v_rid := COALESCE(NEW.reservation_id, OLD.reservation_id);
  IF v_rid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT CASE
    WHEN bool_or(status = 'signed') THEN 'signed'
    WHEN bool_or(status = 'sent') THEN 'sent'
    WHEN bool_or(status = 'draft') THEN 'draft'
    ELSE 'none'
  END
  INTO v_status
  FROM contracts
  WHERE reservation_id = v_rid
    AND status NOT IN ('archived', 'expired');

  UPDATE reservations
  SET contract_status = COALESCE(v_status, 'none'),
      updated_at = now()
  WHERE id = v_rid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reservation_contract_status ON contracts;
CREATE TRIGGER trg_sync_reservation_contract_status
  AFTER INSERT OR UPDATE OF status, reservation_id OR DELETE
  ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reservation_contract_status();

-- ─── 3. Harden token RPCs (expiry + signature hash) ──────────────────────────
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
    AND (signing_expires_at IS NULL OR signing_expires_at > now())
  LIMIT 1;
$$;

DROP FUNCTION IF EXISTS public.sign_contract_by_token(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.sign_contract_by_token(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.sign_contract_by_token(
  p_token          TEXT,
  p_signer_name    TEXT,
  p_signer_role    TEXT,
  p_signature_data TEXT,
  p_signature_hash TEXT DEFAULT NULL
)
RETURNS contracts
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
  IF v_contract.signing_expires_at IS NOT NULL AND v_contract.signing_expires_at <= now() THEN
    RAISE EXCEPTION 'Signing link has expired';
  END IF;
  IF v_contract.status IN ('signed', 'archived', 'expired') THEN
    RAISE EXCEPTION 'Contract already signed';
  END IF;

  INSERT INTO contract_signatures (contract_id, signer_name, signer_role, signature_data, signed_at)
  VALUES (v_contract.id, p_signer_name, p_signer_role, p_signature_data, now());

  UPDATE contracts
  SET status = 'signed',
      signed_at = now(),
      signature_hash = COALESCE(p_signature_hash, signature_hash)
  WHERE id = v_contract.id
  RETURNING * INTO v_contract;

  INSERT INTO notifications (user_id, type, title, message, read, data)
  SELECT pr.id,
         'system',
         'Contract signed',
         p_signer_name || ' signed the contract for ' || v_contract.guest_name,
         false,
         jsonb_build_object('contract_id', v_contract.id)
  FROM profiles pr
  WHERE pr.role = 'owner';

  RETURN v_contract;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_contract_signing_token(p_contract_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_owner() AND NOT EXISTS (
    SELECT 1 FROM contracts c
    WHERE c.id = p_contract_id
      AND (
        c.reservation_id IS NULL
        OR public.can_access_reservation(c.reservation_id)
      )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE contracts
  SET signing_token = NULL,
      signing_expires_at = NULL
  WHERE id = p_contract_id
    AND status IN ('draft', 'sent');
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_by_token(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_contract_by_token(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_contract_signing_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_contract_by_token(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_contract_signing_token(UUID) TO authenticated;

-- Allow the public signing page to attach the certificate URL after sign
CREATE OR REPLACE FUNCTION public.attach_signed_document(
  p_token TEXT,
  p_signed_document_url TEXT,
  p_signature_hash TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 OR coalesce(p_signed_document_url, '') = '' THEN
    RAISE EXCEPTION 'Invalid request';
  END IF;

  UPDATE contracts
  SET signed_document_url = p_signed_document_url,
      signature_hash = COALESCE(p_signature_hash, signature_hash)
  WHERE signing_token = p_token
    AND status = 'signed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found or not signed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_signed_document(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_signed_document(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ─── 4. Contract templates: scope to creator ─────────────────────────────────
DROP POLICY IF EXISTS "Authenticated manage contract_templates" ON contract_templates;
DROP POLICY IF EXISTS "Users manage own templates" ON contract_templates;
DROP POLICY IF EXISTS "Users read own templates" ON contract_templates;
DROP POLICY IF EXISTS "Users insert own templates" ON contract_templates;
DROP POLICY IF EXISTS "Users update own templates" ON contract_templates;
DROP POLICY IF EXISTS "Users delete own templates" ON contract_templates;

CREATE POLICY "Users read own templates"
  ON contract_templates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_app_owner());

CREATE POLICY "Users insert own templates"
  ON contract_templates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own templates"
  ON contract_templates FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_app_owner())
  WITH CHECK (user_id = auth.uid() OR public.is_app_owner());

CREATE POLICY "Users delete own templates"
  ON contract_templates FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_app_owner());
