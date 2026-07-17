-- Messagerie séjour — messages enrichis (cartes boutique/conciergerie, photos, langue voyageur)

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS guest_language text;

COMMENT ON COLUMN public.reservations.guest_language IS
  'Code langue BCP-47 pour le voyageur (ex. fr-FR, en-US). Utilisé pour la dictée vocale.';

ALTER TABLE public.stay_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'product_card', 'service_card'));

ALTER TABLE public.stay_messages
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.stay_messages
  ALTER COLUMN body DROP NOT NULL;

ALTER TABLE public.stay_messages
  DROP CONSTRAINT IF EXISTS stay_messages_body_check;

ALTER TABLE public.stay_messages
  ADD CONSTRAINT stay_messages_body_check CHECK (
    (message_type = 'text' AND char_length(trim(coalesce(body, ''))) > 0)
    OR (message_type = 'image' AND (payload ? 'image_url'))
    OR (message_type IN ('product_card', 'service_card') AND payload <> '{}'::jsonb)
  );

-- ─── Upload photos voyageur ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stay_message_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stay_message_upload_tokens_expires_idx
  ON public.stay_message_upload_tokens (expires_at);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stay-messages',
  'stay-messages',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read stay message attachments" ON storage.objects;
CREATE POLICY "Public read stay message attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'stay-messages');

DROP POLICY IF EXISTS "Guest upload stay message attachments" ON storage.objects;
CREATE POLICY "Guest upload stay message attachments"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'stay-messages'
  AND EXISTS (
    SELECT 1 FROM public.stay_message_upload_tokens t
    WHERE t.storage_path = name AND t.expires_at > now()
  )
);

DROP POLICY IF EXISTS "Staff upload stay message attachments" ON storage.objects;
CREATE POLICY "Staff upload stay message attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'stay-messages'
  AND (storage.foldername(name))[1] = 'staff'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- ─── Helpers ────────────────────────────────────────────────────────────────

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
    RETURN coalesce(p_payload->>'image_url', '') <> '';
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

CREATE OR REPLACE FUNCTION public.guest_prepare_stay_message_upload(
  p_token uuid,
  p_extension text DEFAULT 'jpg'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  upload_id uuid;
  storage_path text;
  safe_ext text;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  safe_ext := lower(regexp_replace(coalesce(nullif(trim(p_extension), ''), 'jpg'), '[^a-z0-9]', '', 'g'));
  IF safe_ext = '' THEN
    safe_ext := 'jpg';
  END IF;

  upload_id := gen_random_uuid();
  storage_path := upload_id::text || '/photo.' || safe_ext;

  INSERT INTO public.stay_message_upload_tokens (reservation_id, storage_path, expires_at)
  VALUES (res.id, storage_path, now() + interval '15 minutes');

  RETURN jsonb_build_object(
    'storage_path', storage_path,
    'bucket', 'stay-messages'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_send_stay_message(
  p_token uuid,
  p_body text DEFAULT NULL,
  p_message_type text DEFAULT 'text',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.stay_conversations;
  msg public.stay_messages;
  trimmed text;
  safe_payload jsonb;
BEGIN
  trimmed := nullif(trim(coalesce(p_body, '')), '');
  safe_payload := coalesce(p_payload, '{}'::jsonb);

  IF NOT public._validate_stay_message(p_message_type, trimmed, safe_payload) THEN
    RETURN jsonb_build_object('error', 'invalid_message');
  END IF;

  conv := public._ensure_stay_conversation(p_token);
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  INSERT INTO public.stay_messages (conversation_id, sender_type, body, message_type, payload)
  VALUES (conv.id, 'guest', trimmed, p_message_type, safe_payload)
  RETURNING * INTO msg;

  UPDATE public.stay_conversations
  SET last_message_at = msg.created_at, updated_at = now()
  WHERE id = conv.id;

  RETURN jsonb_build_object('message', to_jsonb(msg));
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_send_stay_message(
  p_conversation_id uuid,
  p_body text DEFAULT NULL,
  p_message_type text DEFAULT 'text',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.stay_conversations;
  msg public.stay_messages;
  trimmed text;
  safe_payload jsonb;
BEGIN
  trimmed := nullif(trim(coalesce(p_body, '')), '');
  safe_payload := coalesce(p_payload, '{}'::jsonb);

  IF NOT public._validate_stay_message(p_message_type, trimmed, safe_payload) THEN
    RETURN jsonb_build_object('error', 'invalid_message');
  END IF;

  SELECT * INTO conv FROM public.stay_conversations WHERE id = p_conversation_id;
  IF NOT FOUND OR NOT public.can_access_property(conv.property_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  INSERT INTO public.stay_messages (
    conversation_id, sender_type, sender_user_id, body, message_type, payload
  )
  VALUES (conv.id, 'staff', auth.uid(), trimmed, p_message_type, safe_payload)
  RETURNING * INTO msg;

  UPDATE public.stay_conversations
  SET last_message_at = msg.created_at, updated_at = now()
  WHERE id = conv.id;

  RETURN jsonb_build_object('message', to_jsonb(msg));
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_mark_stay_messages_read(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.stay_conversations;
BEGIN
  SELECT * INTO conv FROM public.stay_conversations WHERE id = p_conversation_id;
  IF NOT FOUND OR NOT public.can_access_property(conv.property_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE public.stay_messages
  SET read_at = now()
  WHERE conversation_id = conv.id
    AND sender_type = 'guest'
    AND read_at IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_prepare_stay_message_upload(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_send_stay_message(uuid, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_send_stay_message(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_mark_stay_messages_read(uuid) TO authenticated;

-- Retire les anciennes signatures texte seul (évite les ambiguïtés RPC)
DROP FUNCTION IF EXISTS public.guest_send_stay_message(uuid, text);
DROP FUNCTION IF EXISTS public.staff_send_stay_message(uuid, text);

-- Ajoute guest_language au payload reservation du portail voyageur
CREATE OR REPLACE FUNCTION public.get_guest_stay_portal(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  prop record;
  portal_settings jsonb;
  guides_json jsonb;
  services_json jsonb;
  reserve record;
  requests_json jsonb;
  transactions_json jsonb;
  nights integer;
  recommended numeric;
  reservation_json jsonb;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT p.id, p.name, p.image_url, p.type, p.max_guests
  INTO prop
  FROM public.properties p
  WHERE p.id = res.property_id;

  SELECT to_jsonb(s.*) INTO portal_settings
  FROM public.property_guest_portal_settings s
  WHERE s.property_id = res.property_id;

  reservation_json := jsonb_build_object(
    'id', res.id,
    'guest_name', res.guest_name,
    'arrival', res.arrival,
    'departure', res.departure,
    'guests_count', res.guests_count,
    'property_id', res.property_id,
    'property_name', prop.name,
    'property_image_url', prop.image_url,
    'property_type', prop.type,
    'max_guests', prop.max_guests,
    'guest_language', res.guest_language
  );

  IF portal_settings IS NOT NULL
     AND COALESCE((portal_settings->>'enabled')::boolean, true) = false THEN
    RETURN jsonb_build_object(
      'reservation', reservation_json,
      'settings', jsonb_build_object('property_id', res.property_id, 'enabled', false),
      'guides', '[]'::jsonb,
      'property_services', '[]'::jsonb,
      'reserve', NULL,
      'service_requests', '[]'::jsonb,
      'transactions', '[]'::jsonb,
      'recommended_amount', 0
    );
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(g.*) ORDER BY g.sort_order, g.title), '[]'::jsonb)
  INTO guides_json
  FROM public.guides g
  WHERE g.property_id = res.property_id AND g.published = true;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'enabled', ps.enabled,
        'assignment', to_jsonb(ps),
        'service', to_jsonb(s)
      ) ORDER BY ps.sort_order
    ),
    '[]'::jsonb
  )
  INTO services_json
  FROM public.property_services ps
  JOIN public.services s ON s.id = ps.service_id
  WHERE ps.property_id = res.property_id AND ps.enabled = true;

  SELECT * INTO reserve FROM public.stay_reserves WHERE reservation_id = res.id;

  IF reserve.id IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(r.*) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO requests_json
    FROM public.stay_service_requests r
    WHERE r.stay_reserve_id = reserve.id;

    SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.created_at DESC), '[]'::jsonb)
    INTO transactions_json
    FROM public.reserve_transactions t
    WHERE t.stay_reserve_id = reserve.id;
  ELSE
    requests_json := '[]'::jsonb;
    transactions_json := '[]'::jsonb;
  END IF;

  nights := GREATEST(1, (res.departure - res.arrival));
  recommended := public.recommend_stay_reserve_amount(nights, prop.max_guests, prop.type);

  RETURN jsonb_build_object(
    'reservation', reservation_json,
    'settings', COALESCE(portal_settings, jsonb_build_object('property_id', res.property_id, 'enabled', true)),
    'guides', guides_json,
    'property_services', services_json,
    'reserve', CASE WHEN reserve.id IS NULL THEN NULL ELSE to_jsonb(reserve) END,
    'service_requests', requests_json,
    'transactions', transactions_json,
    'recommended_amount', recommended
  );
END;
$$;

