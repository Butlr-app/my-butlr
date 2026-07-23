-- Token-scoped online check-in for the native Guest application.
-- Guests never receive direct table access: the reservation is always resolved
-- server-side from the existing portal_access_token.

CREATE OR REPLACE FUNCTION public.guest_get_checkin(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reservation_row public.reservations%ROWTYPE;
  checkin_row public.checkins%ROWTYPE;
BEGIN
  SELECT *
  INTO reservation_row
  FROM public._resolve_guest_reservation(p_token);

  IF reservation_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF NOT public._guest_portal_is_enabled(reservation_row.property_id) THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;

  SELECT *
  INTO checkin_row
  FROM public.checkins
  WHERE reservation_id = reservation_row.id;

  RETURN jsonb_build_object(
    'checkin',
    CASE
      WHEN checkin_row.id IS NULL THEN NULL
      ELSE to_jsonb(checkin_row) - 'id_document_url'
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_submit_checkin(
  p_token uuid,
  p_guest_name text,
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_nationality text DEFAULT NULL,
  p_id_doc_type text DEFAULT 'passport',
  p_id_doc_number text DEFAULT NULL,
  p_num_guests integer DEFAULT 1,
  p_estimated_arrival text DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  p_signature_data text DEFAULT NULL,
  p_rules_accepted boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reservation_row public.reservations%ROWTYPE;
  checkin_row public.checkins%ROWTYPE;
  portal_requires_checkin boolean;
BEGIN
  SELECT *
  INTO reservation_row
  FROM public._resolve_guest_reservation(p_token);

  IF reservation_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF NOT public._guest_portal_is_enabled(reservation_row.property_id) THEN
    RETURN jsonb_build_object('error', 'portal_disabled');
  END IF;

  SELECT COALESCE(settings.require_online_checkin, true)
  INTO portal_requires_checkin
  FROM public.property_guest_portal_settings AS settings
  WHERE settings.property_id = reservation_row.property_id;

  IF COALESCE(portal_requires_checkin, true) = false THEN
    RETURN jsonb_build_object('error', 'checkin_disabled');
  END IF;

  IF current_date > reservation_row.departure THEN
    RETURN jsonb_build_object('error', 'stay_finished');
  END IF;

  SELECT *
  INTO checkin_row
  FROM public.checkins
  WHERE reservation_id = reservation_row.id;

  IF checkin_row.status = 'completed' THEN
    RETURN jsonb_build_object('error', 'already_completed');
  END IF;

  IF NULLIF(btrim(p_guest_name), '') IS NULL OR length(btrim(p_guest_name)) > 200 THEN
    RETURN jsonb_build_object('error', 'invalid_guest_name');
  END IF;

  IF p_guest_email IS NOT NULL
     AND (length(btrim(p_guest_email)) > 320 OR position('@' IN p_guest_email) = 0) THEN
    RETURN jsonb_build_object('error', 'invalid_email');
  END IF;

  IF p_id_doc_type NOT IN ('passport', 'id_card', 'driver_license') THEN
    RETURN jsonb_build_object('error', 'invalid_document_type');
  END IF;

  IF NULLIF(btrim(p_id_doc_number), '') IS NULL
     OR length(btrim(p_id_doc_number)) > 120 THEN
    RETURN jsonb_build_object('error', 'invalid_document_number');
  END IF;

  IF p_num_guests IS NULL OR p_num_guests < 1 OR p_num_guests > 100 THEN
    RETURN jsonb_build_object('error', 'invalid_guest_count');
  END IF;

  IF p_estimated_arrival IS NULL
     OR p_estimated_arrival !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RETURN jsonb_build_object('error', 'invalid_arrival_time');
  END IF;

  IF p_rules_accepted IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('error', 'rules_not_accepted');
  END IF;

  IF p_signature_data IS NULL
     OR p_signature_data NOT LIKE 'data:image/%;base64,%'
     OR length(p_signature_data) > 1500000 THEN
    RETURN jsonb_build_object('error', 'invalid_signature');
  END IF;

  IF length(COALESCE(p_guest_phone, '')) > 60
     OR length(COALESCE(p_address, '')) > 500
     OR length(COALESCE(p_nationality, '')) > 120
     OR length(COALESCE(p_special_requests, '')) > 2000 THEN
    RETURN jsonb_build_object('error', 'field_too_long');
  END IF;

  INSERT INTO public.checkins (
    reservation_id,
    guest_name,
    guest_email,
    guest_phone,
    address,
    nationality,
    id_doc_type,
    id_doc_number,
    num_guests,
    estimated_arrival,
    special_requests,
    signature_data,
    rules_accepted,
    status,
    submitted_at,
    updated_at
  )
  VALUES (
    reservation_row.id,
    btrim(p_guest_name),
    NULLIF(btrim(p_guest_email), ''),
    NULLIF(btrim(p_guest_phone), ''),
    NULLIF(btrim(p_address), ''),
    NULLIF(btrim(p_nationality), ''),
    p_id_doc_type,
    btrim(p_id_doc_number),
    p_num_guests,
    p_estimated_arrival,
    NULLIF(btrim(p_special_requests), ''),
    p_signature_data,
    true,
    'completed',
    now(),
    now()
  )
  ON CONFLICT (reservation_id) DO UPDATE
  SET
    guest_name = EXCLUDED.guest_name,
    guest_email = EXCLUDED.guest_email,
    guest_phone = EXCLUDED.guest_phone,
    address = EXCLUDED.address,
    nationality = EXCLUDED.nationality,
    id_doc_type = EXCLUDED.id_doc_type,
    id_doc_number = EXCLUDED.id_doc_number,
    num_guests = EXCLUDED.num_guests,
    estimated_arrival = EXCLUDED.estimated_arrival,
    special_requests = EXCLUDED.special_requests,
    signature_data = EXCLUDED.signature_data,
    rules_accepted = true,
    status = 'completed',
    submitted_at = now(),
    updated_at = now()
  RETURNING * INTO checkin_row;

  RETURN jsonb_build_object(
    'checkin',
    to_jsonb(checkin_row) - 'id_document_url'
  );
END;
$$;

REVOKE ALL ON TABLE public.checkins FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.guest_get_checkin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_get_checkin(uuid)
TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.guest_submit_checkin(
  uuid, text, text, text, text, text, text, text, integer, text, text, text, boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guest_submit_checkin(
  uuid, text, text, text, text, text, text, text, integer, text, text, text, boolean
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.guest_get_checkin(uuid)
IS 'Returns the check-in associated with a valid guest portal token.';

COMMENT ON FUNCTION public.guest_submit_checkin(
  uuid, text, text, text, text, text, text, text, integer, text, text, text, boolean
)
IS 'Validates and completes online check-in for a token-scoped guest reservation.';
