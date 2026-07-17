-- Les fonctions SQL retournant un type composite produisent une ligne NULL
-- lorsqu'aucune réservation ne correspond. Vérifie donc explicitement res.id.

CREATE OR REPLACE FUNCTION public._ensure_stay_conversation(p_token uuid)
RETURNS public.stay_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  conv public.stay_conversations;
  contact_role text;
  contact_user uuid;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO conv FROM public.stay_conversations WHERE reservation_id = res.id;
  IF conv.id IS NOT NULL THEN
    RETURN conv;
  END IF;

  SELECT s.message_contact_role INTO contact_role
  FROM public.property_guest_portal_settings s
  WHERE s.property_id = res.property_id;

  contact_role := COALESCE(contact_role, 'house_manager');
  contact_user := public._resolve_property_contact_user(res.property_id, contact_role);

  INSERT INTO public.stay_conversations (
    reservation_id, property_id, recipient_role, recipient_user_id, guest_name
  ) VALUES (
    res.id, res.property_id, contact_role, contact_user, res.guest_name
  )
  RETURNING * INTO conv;

  RETURN conv;
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_get_stay_messages(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  settings record;
  conv public.stay_conversations;
  contact record;
  messages_json jsonb;
  unread_count integer;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT s.show_messaging, s.message_contact_role
  INTO settings
  FROM public.property_guest_portal_settings s
  WHERE s.property_id = res.property_id;

  IF COALESCE(settings.show_messaging, true) = false THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  conv := public._ensure_stay_conversation(p_token);
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT p.full_name, p.email, p.phone, p.avatar_url
  INTO contact
  FROM public.profiles p
  WHERE p.id = conv.recipient_user_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(m.*) ORDER BY m.created_at ASC), '[]'::jsonb)
  INTO messages_json
  FROM public.stay_messages m
  WHERE m.conversation_id = conv.id;

  SELECT count(*)::integer INTO unread_count
  FROM public.stay_messages m
  WHERE m.conversation_id = conv.id
    AND m.sender_type = 'staff'
    AND m.read_at IS NULL;

  RETURN jsonb_build_object(
    'enabled', true,
    'conversation', to_jsonb(conv),
    'contact', jsonb_build_object(
      'role', conv.recipient_role,
      'full_name', contact.full_name,
      'email', contact.email,
      'phone', contact.phone,
      'avatar_url', contact.avatar_url
    ),
    'messages', messages_json,
    'unread_count', unread_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_mark_stay_messages_read(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  conv public.stay_conversations;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF res.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT * INTO conv FROM public.stay_conversations WHERE reservation_id = res.id;
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'unread_count', 0);
  END IF;

  UPDATE public.stay_messages
  SET read_at = now()
  WHERE conversation_id = conv.id
    AND sender_type = 'staff'
    AND read_at IS NULL;

  RETURN jsonb_build_object('ok', true, 'unread_count', 0);
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
  IF res.id IS NULL THEN
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
