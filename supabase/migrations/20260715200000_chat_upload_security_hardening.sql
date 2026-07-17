-- Durcit les uploads de photos du chat et valide les types côté serveur.

ALTER TABLE public.stay_message_upload_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.stay_message_upload_tokens FROM anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_upload_stay_message_object(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stay_message_upload_tokens token
    WHERE token.storage_path = p_name
      AND token.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION private.can_upload_stay_message_object(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_upload_stay_message_object(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Guest upload stay message attachments" ON storage.objects;
CREATE POLICY "Guest upload stay message attachments"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'stay-messages'
  AND private.can_upload_stay_message_object(name)
);

ALTER TABLE public.stay_messages
  DROP CONSTRAINT IF EXISTS stay_messages_body_check;

ALTER TABLE public.stay_messages
  ADD CONSTRAINT stay_messages_body_check CHECK (
    (message_type = 'text' AND char_length(trim(coalesce(body, ''))) > 0)
    OR (message_type = 'image' AND (payload ? 'storage_path'))
    OR (message_type IN ('product_card', 'service_card') AND payload <> '{}'::jsonb)
  );

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
    RETURN coalesce(p_payload->>'storage_path', '') <> '';
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

  DELETE FROM public.stay_message_upload_tokens WHERE expires_at < now();

  safe_ext := lower(regexp_replace(coalesce(nullif(trim(p_extension), ''), 'jpg'), '[^a-z0-9]', '', 'g'));
  IF safe_ext NOT IN ('jpg', 'jpeg', 'png', 'webp') THEN
    RETURN jsonb_build_object('error', 'invalid_extension');
  END IF;

  upload_id := gen_random_uuid();
  storage_path := upload_id::text || '/photo.' || safe_ext;

  INSERT INTO public.stay_message_upload_tokens (reservation_id, storage_path, expires_at)
  VALUES (res.id, storage_path, now() + interval '15 minutes');

  RETURN jsonb_build_object('storage_path', storage_path, 'bucket', 'stay-messages');
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
  image_path text;
BEGIN
  trimmed := nullif(trim(coalesce(p_body, '')), '');
  safe_payload := coalesce(p_payload, '{}'::jsonb);

  IF p_message_type NOT IN ('text', 'image') THEN
    RETURN jsonb_build_object('error', 'invalid_message');
  END IF;

  conv := public._ensure_stay_conversation(p_token);
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF p_message_type = 'image' THEN
    image_path := safe_payload->>'storage_path';
    IF image_path IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.stay_message_upload_tokens token
      JOIN storage.objects object
        ON object.bucket_id = 'stay-messages'
       AND object.name = token.storage_path
      WHERE token.reservation_id = conv.reservation_id
        AND token.storage_path = image_path
        AND token.expires_at > now()
    ) THEN
      RETURN jsonb_build_object('error', 'invalid_message');
    END IF;
    safe_payload := jsonb_build_object('storage_path', image_path);
  ELSIF NOT public._validate_stay_message(p_message_type, trimmed, safe_payload) THEN
    RETURN jsonb_build_object('error', 'invalid_message');
  END IF;

  INSERT INTO public.stay_messages (conversation_id, sender_type, body, message_type, payload)
  VALUES (conv.id, 'guest', trimmed, p_message_type, safe_payload)
  RETURNING * INTO msg;

  IF p_message_type = 'image' THEN
    DELETE FROM public.stay_message_upload_tokens WHERE storage_path = image_path;
  END IF;

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
  image_path text;
BEGIN
  trimmed := nullif(trim(coalesce(p_body, '')), '');
  safe_payload := coalesce(p_payload, '{}'::jsonb);

  SELECT * INTO conv FROM public.stay_conversations WHERE id = p_conversation_id;
  IF NOT FOUND OR NOT public.can_access_property(conv.property_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  IF p_message_type = 'image' THEN
    image_path := safe_payload->>'storage_path';
    IF image_path IS NULL
       OR split_part(image_path, '/', 1) <> 'staff'
       OR split_part(image_path, '/', 2) <> auth.uid()::text
       OR NOT EXISTS (
         SELECT 1 FROM storage.objects object
         WHERE object.bucket_id = 'stay-messages' AND object.name = image_path
       ) THEN
      RETURN jsonb_build_object('error', 'invalid_message');
    END IF;
    safe_payload := jsonb_build_object('storage_path', image_path);
  ELSIF NOT public._validate_stay_message(p_message_type, trimmed, safe_payload) THEN
    RETURN jsonb_build_object('error', 'invalid_message');
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
