-- Lot 1: private stay-messages + signed-URL-friendly SELECT policies
-- Lot 1: privatize unused public buckets; expire stale signature envelopes
-- Lot 1: notify property-scoped owners on contract sign (not all owners)
-- Lot 2: guest top-up creates pending transactions; staff approve/reject

CREATE SCHEMA IF NOT EXISTS private;

-- ═══════════════════════════════════════════════════════════════════════════
-- Storage: stay-messages private
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE storage.buckets
SET public = false
WHERE id = 'stay-messages';

DROP POLICY IF EXISTS "Public read stay message attachments" ON storage.objects;

CREATE OR REPLACE FUNCTION private.can_read_stay_message_object(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.stay_messages m
      JOIN public.stay_conversations c ON c.id = m.conversation_id
      WHERE m.payload->>'storage_path' = object_name
        AND public.can_access_property(c.property_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.stay_messages m
      JOIN public.stay_conversations c ON c.id = m.conversation_id
      JOIN public.reservations r ON r.id = c.reservation_id
      WHERE m.payload->>'storage_path' = object_name
        AND r.booking_kind = 'guest'
        AND r.status <> 'cancelled'
        AND r.departure >= (current_date - interval '14 days')
    )
    OR EXISTS (
      SELECT 1
      FROM public.stay_message_upload_tokens t
      WHERE t.storage_path = object_name
        AND t.expires_at > now()
    );
$$;

REVOKE ALL ON FUNCTION private.can_read_stay_message_object(text) FROM PUBLIC;

DROP POLICY IF EXISTS "Read stay message attachments" ON storage.objects;
CREATE POLICY "Read stay message attachments"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'stay-messages'
  AND private.can_read_stay_message_object(name)
);

-- Adjacent buckets: remove public SELECT; keep private
UPDATE storage.buckets SET public = false WHERE id IN ('signed-contracts', 'chat-attachments');

DROP POLICY IF EXISTS "Public read signed contracts" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat attachments" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated read signed contracts" ON storage.objects;
CREATE POLICY "Authenticated read signed contracts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signed-contracts');

DROP POLICY IF EXISTS "Authenticated read chat attachments" ON storage.objects;
CREATE POLICY "Authenticated read chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments');

-- Image validation: storage_path is enough (no public URL required)
CREATE OR REPLACE FUNCTION public._validate_stay_message(
  p_message_type text,
  p_body text,
  p_payload jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_message_type = 'text' THEN
    RETURN char_length(trim(coalesce(p_body, ''))) > 0;
  ELSIF p_message_type = 'image' THEN
    RETURN coalesce(p_payload->>'storage_path', '') <> ''
      OR coalesce(p_payload->>'image_url', '') <> '';
  ELSIF p_message_type = 'product_card' THEN
    RETURN coalesce(p_payload->>'catalog_item_id', '') <> ''
      AND coalesce(p_payload->>'title', '') <> '';
  ELSIF p_message_type = 'service_card' THEN
    RETURN coalesce(p_payload->>'property_service_id', '') <> ''
      AND coalesce(p_payload->>'title', '') <> '';
  END IF;
  RETURN false;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Signature hygiene
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.expire_stale_signature_envelopes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer := 0;
BEGIN
  UPDATE public.signature_envelopes
  SET status = 'expired', updated_at = now()
  WHERE status IN ('draft', 'sent', 'partially_signed', 'finalizing')
    AND expires_at < now();

  GET DIAGNOSTICS n = ROW_COUNT;

  UPDATE public.contracts c
  SET
    signing_status = 'expired',
    status = CASE WHEN c.status = 'sent' THEN 'expired' ELSE c.status END
  WHERE c.signing_expires_at IS NOT NULL
    AND c.signing_expires_at < now()
    AND coalesce(c.signing_status, '') NOT IN ('completed', 'signed', 'expired', 'voided', 'declined')
    AND c.status IN ('sent', 'draft');

  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_signature_envelopes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_signature_envelopes() TO authenticated;

-- Optional cron (pg_cron installed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'expire-stale-signature-envelopes';

    PERFORM cron.schedule(
      'expire-stale-signature-envelopes',
      '15 * * * *',
      $cron$SELECT public.expire_stale_signature_envelopes();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END;
$$;

-- Restrict contract-signed notifications to property owners / team admins
CREATE OR REPLACE FUNCTION public.sign_contract_by_token(
  p_token text,
  p_signer_name text,
  p_signer_role text,
  p_signature_data text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract contracts%ROWTYPE;
  v_property_id uuid;
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

  SELECT r.property_id INTO v_property_id
  FROM reservations r
  WHERE r.id = v_contract.reservation_id;

  IF v_property_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, read, data)
    SELECT DISTINCT notify_user_id,
           'system',
           'Contrat signé',
           p_signer_name || ' a signé le contrat pour ' || v_contract.guest_name,
           false,
           jsonb_build_object('contract_id', v_contract.id, 'property_id', v_property_id)
    FROM (
      SELECT p.owner_id AS notify_user_id
      FROM properties p
      WHERE p.id = v_property_id
        AND p.owner_id IS NOT NULL
      UNION
      SELECT ra.user_id AS notify_user_id
      FROM role_assignments ra
      WHERE ra.property_id = v_property_id
        AND ra.user_id IS NOT NULL
        AND ra.role IN ('owner', 'house_manager')
    ) recipients;
  END IF;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Lot 2: pending guest top-ups + staff confirmation
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guest_activate_stay_reserve(p_token uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  reserve_id uuid;
  reserve_row public.stay_reserves;
  tx_row public.reserve_transactions;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RETURN jsonb_build_object('error', 'invalid_amount');
  END IF;

  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  IF NOT public._guest_portal_is_enabled(res.property_id) THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;

  SELECT id INTO reserve_id FROM public.stay_reserves WHERE reservation_id = res.id;

  IF reserve_id IS NULL THEN
    INSERT INTO public.stay_reserves (
      reservation_id, property_id, recommended_amount, initial_amount, current_balance,
      status, approval_mode, auto_approval_limit
    ) VALUES (
      res.id, res.property_id, p_amount, 0, 0,
      'pending_payment', 'auto_under_limit', 300
    ) RETURNING id INTO reserve_id;
  END IF;

  INSERT INTO public.reserve_transactions (
    stay_reserve_id, type, amount, currency, status, description
  ) VALUES (
    reserve_id, 'top_up', p_amount, 'EUR', 'pending',
    'Demande de crédit Réserve séjour (validation villa)'
  ) RETURNING * INTO tx_row;

  PERFORM public.refresh_stay_reserve_status(reserve_id);
  SELECT * INTO reserve_row FROM public.stay_reserves WHERE id = reserve_id;

  RETURN jsonb_build_object(
    'reserve', to_jsonb(reserve_row),
    'transaction', to_jsonb(tx_row),
    'pending', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_top_up_stay_reserve(p_token uuid, p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.guest_activate_stay_reserve(p_token, p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_confirm_reserve_top_up(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.reserve_transactions;
  reserve_row public.stay_reserves;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT * INTO tx
  FROM public.reserve_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF tx.type <> 'top_up' OR tx.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  SELECT * INTO reserve_row
  FROM public.stay_reserves
  WHERE id = tx.stay_reserve_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.can_access_property(reserve_row.property_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE public.stay_reserves
  SET
    initial_amount = initial_amount + tx.amount,
    current_balance = current_balance + tx.amount,
    status = 'funded',
    updated_at = now()
  WHERE id = reserve_row.id
  RETURNING * INTO reserve_row;

  UPDATE public.reserve_transactions
  SET status = 'completed'
  WHERE id = tx.id
  RETURNING * INTO tx;

  PERFORM public.refresh_stay_reserve_status(reserve_row.id);

  RETURN jsonb_build_object('reserve', to_jsonb(reserve_row), 'transaction', to_jsonb(tx));
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_reject_reserve_top_up(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx public.reserve_transactions;
  reserve_row public.stay_reserves;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT * INTO tx
  FROM public.reserve_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF tx.type <> 'top_up' OR tx.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  SELECT * INTO reserve_row
  FROM public.stay_reserves
  WHERE id = tx.stay_reserve_id;

  IF NOT FOUND OR NOT public.can_access_property(reserve_row.property_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE public.reserve_transactions
  SET status = 'cancelled'
  WHERE id = tx.id
  RETURNING * INTO tx;

  PERFORM public.refresh_stay_reserve_status(reserve_row.id);
  SELECT * INTO reserve_row FROM public.stay_reserves WHERE id = reserve_row.id;

  RETURN jsonb_build_object('reserve', to_jsonb(reserve_row), 'transaction', to_jsonb(tx));
END;
$$;

REVOKE ALL ON FUNCTION public.staff_confirm_reserve_top_up(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_reject_reserve_top_up(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_confirm_reserve_top_up(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_reject_reserve_top_up(uuid) TO authenticated;
