-- Messagerie séjour — compteur de non-lus fiable + marquage lu explicite
--
-- Auparavant, guest_get_stay_messages marquait les messages staff comme lus
-- avant de compter, si bien que unread_count valait toujours 0. On sépare
-- désormais la lecture (get, qui compte réellement les non-lus) du marquage
-- (mark_read, appelé quand le voyageur ouvre l'onglet Messages).

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
  IF NOT FOUND THEN
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

  -- NB : on ne marque plus les messages comme lus ici.
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
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT * INTO conv FROM public.stay_conversations WHERE reservation_id = res.id;
  IF NOT FOUND THEN
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

GRANT EXECUTE ON FUNCTION public.guest_get_stay_messages(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_mark_stay_messages_read(uuid) TO anon, authenticated;
