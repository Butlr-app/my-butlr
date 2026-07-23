-- Messagerie séjour — voyageur ↔ house manager / conciergerie

ALTER TABLE public.property_guest_portal_settings
  ADD COLUMN IF NOT EXISTS show_messaging boolean NOT NULL DEFAULT true;

ALTER TABLE public.property_guest_portal_settings
  ADD COLUMN IF NOT EXISTS message_contact_role text NOT NULL DEFAULT 'house_manager'
    CHECK (message_contact_role IN ('house_manager', 'concierge'));

COMMENT ON COLUMN public.property_guest_portal_settings.message_contact_role IS
  'Rôle de l''équipe qui reçoit les messages voyageur pour cette villa.';

-- ─── Conversations & messages ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stay_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  recipient_role text NOT NULL CHECK (recipient_role IN ('house_manager', 'concierge')),
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stay_conversations_property_id_idx ON public.stay_conversations (property_id);
CREATE INDEX IF NOT EXISTS stay_conversations_last_message_at_idx ON public.stay_conversations (last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.stay_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.stay_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('guest', 'staff')),
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stay_messages_conversation_id_idx ON public.stay_messages (conversation_id, created_at);

ALTER TABLE public.stay_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stay conversations by property access" ON public.stay_conversations;
CREATE POLICY "Stay conversations by property access"
ON public.stay_conversations FOR ALL TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Stay messages by property access" ON public.stay_messages;
CREATE POLICY "Stay messages by property access"
ON public.stay_messages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stay_conversations c
    WHERE c.id = conversation_id AND public.can_access_property(c.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stay_conversations c
    WHERE c.id = conversation_id AND public.can_access_property(c.property_id)
  )
);

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._resolve_property_contact_user(
  p_property_id uuid,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_owner_id uuid;
BEGIN
  SELECT ra.user_id INTO v_user_id
  FROM public.role_assignments ra
  WHERE ra.property_id = p_property_id AND ra.role = p_role
  ORDER BY ra.created_at ASC
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  IF p_role = 'house_manager' THEN
    SELECT ra.user_id INTO v_user_id
    FROM public.role_assignments ra
    WHERE ra.property_id = p_property_id AND ra.role = 'concierge'
    ORDER BY ra.created_at ASC
    LIMIT 1;
  ELSE
    SELECT ra.user_id INTO v_user_id
    FROM public.role_assignments ra
    WHERE ra.property_id = p_property_id AND ra.role = 'house_manager'
    ORDER BY ra.created_at ASC
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  SELECT p.owner_id INTO v_owner_id FROM public.properties p WHERE p.id = p_property_id;
  RETURN v_owner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._ensure_stay_conversation(p_token uuid)
RETURNS public.stay_conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res public.reservations;
  settings record;
  conv public.stay_conversations;
  contact_role text;
  contact_user uuid;
BEGIN
  SELECT * INTO res FROM public._resolve_guest_reservation(p_token);
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO conv FROM public.stay_conversations WHERE reservation_id = res.id;
  IF FOUND THEN
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

  UPDATE public.stay_messages
  SET read_at = now()
  WHERE conversation_id = conv.id
    AND sender_type = 'staff'
    AND read_at IS NULL;

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

CREATE OR REPLACE FUNCTION public.guest_send_stay_message(p_token uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.stay_conversations;
  msg public.stay_messages;
  trimmed text;
BEGIN
  trimmed := trim(p_body);
  IF trimmed = '' THEN
    RETURN jsonb_build_object('error', 'empty_body');
  END IF;

  conv := public._ensure_stay_conversation(p_token);
  IF conv.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  INSERT INTO public.stay_messages (conversation_id, sender_type, body)
  VALUES (conv.id, 'guest', trimmed)
  RETURNING * INTO msg;

  UPDATE public.stay_conversations
  SET last_message_at = msg.created_at, updated_at = now()
  WHERE id = conv.id;

  RETURN jsonb_build_object('message', to_jsonb(msg));
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_send_stay_message(p_conversation_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv public.stay_conversations;
  msg public.stay_messages;
  trimmed text;
BEGIN
  trimmed := trim(p_body);
  IF trimmed = '' THEN
    RETURN jsonb_build_object('error', 'empty_body');
  END IF;

  SELECT * INTO conv FROM public.stay_conversations WHERE id = p_conversation_id;
  IF NOT FOUND OR NOT public.can_access_property(conv.property_id) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  INSERT INTO public.stay_messages (conversation_id, sender_type, sender_user_id, body)
  VALUES (conv.id, 'staff', auth.uid(), trimmed)
  RETURNING * INTO msg;

  UPDATE public.stay_conversations
  SET last_message_at = msg.created_at, updated_at = now()
  WHERE id = conv.id;

  RETURN jsonb_build_object('message', to_jsonb(msg));
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_get_stay_messages(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_send_stay_message(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.staff_send_stay_message(uuid, text) TO authenticated;
