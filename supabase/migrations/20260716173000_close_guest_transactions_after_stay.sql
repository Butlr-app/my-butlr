-- Keep the post-stay portal readable while blocking every guest mutation.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.guest_stay_is_open(p_token uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.portal_access_token = p_token
      AND reservation.booking_kind = 'guest'
      AND reservation.status <> 'cancelled'
      AND current_date <= reservation.departure
  );
$$;

ALTER FUNCTION public.guest_activate_stay_reserve(uuid, numeric) SET SCHEMA private;
ALTER FUNCTION public.guest_approve_stay_service_request(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.guest_approve_store_quote(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.guest_checkout_boutique(uuid, jsonb, text, text) SET SCHEMA private;
ALTER FUNCTION public.guest_create_stay_service_request(uuid, text, text, text, date, numeric, uuid, text) SET SCHEMA private;
ALTER FUNCTION public.guest_send_stay_message(uuid, text, text, jsonb) SET SCHEMA private;
ALTER FUNCTION public.guest_top_up_stay_reserve(uuid, numeric) SET SCHEMA private;

CREATE FUNCTION public.guest_activate_stay_reserve(p_token uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN RETURN jsonb_build_object('error', 'stay_finished'); END IF;
  RETURN private.guest_activate_stay_reserve(p_token, p_amount);
END;
$$;

CREATE FUNCTION public.guest_approve_stay_service_request(p_token uuid, p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN RETURN jsonb_build_object('error', 'stay_finished'); END IF;
  RETURN private.guest_approve_stay_service_request(p_token, p_request_id);
END;
$$;

CREATE FUNCTION public.guest_approve_store_quote(p_token uuid, p_order_item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN RETURN jsonb_build_object('error', 'stay_finished'); END IF;
  RETURN private.guest_approve_store_quote(p_token, p_order_item_id);
END;
$$;

CREATE FUNCTION public.guest_checkout_boutique(
  p_token uuid,
  p_items jsonb,
  p_payment_method text DEFAULT 'stay_reserve',
  p_client_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN RETURN jsonb_build_object('error', 'stay_finished'); END IF;
  RETURN private.guest_checkout_boutique(p_token, p_items, p_payment_method, p_client_notes);
END;
$$;

CREATE FUNCTION public.guest_create_stay_service_request(
  p_token uuid,
  p_category text,
  p_title text,
  p_description text,
  p_requested_date date DEFAULT NULL,
  p_estimated_amount numeric DEFAULT NULL,
  p_property_service_id uuid DEFAULT NULL,
  p_provider_name text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN RETURN jsonb_build_object('error', 'stay_finished'); END IF;
  RETURN private.guest_create_stay_service_request(
    p_token, p_category, p_title, p_description, p_requested_date,
    p_estimated_amount, p_property_service_id, p_provider_name
  );
END;
$$;

CREATE FUNCTION public.guest_send_stay_message(
  p_token uuid,
  p_body text DEFAULT NULL,
  p_message_type text DEFAULT 'text',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN RETURN jsonb_build_object('error', 'stay_finished'); END IF;
  RETURN private.guest_send_stay_message(p_token, p_body, p_message_type, p_payload);
END;
$$;

CREATE FUNCTION public.guest_top_up_stay_reserve(p_token uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, private AS $$
BEGIN
  IF NOT private.guest_stay_is_open(p_token) THEN RETURN jsonb_build_object('error', 'stay_finished'); END IF;
  RETURN private.guest_top_up_stay_reserve(p_token, p_amount);
END;
$$;

REVOKE ALL ON FUNCTION private.guest_stay_is_open(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_stay_is_open(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_activate_stay_reserve(uuid, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_approve_stay_service_request(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_approve_store_quote(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_checkout_boutique(uuid, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_create_stay_service_request(uuid, text, text, text, date, numeric, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_send_stay_message(uuid, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_top_up_stay_reserve(uuid, numeric) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.guest_activate_stay_reserve(uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_approve_stay_service_request(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_approve_store_quote(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_checkout_boutique(uuid, jsonb, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_create_stay_service_request(uuid, text, text, text, date, numeric, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_send_stay_message(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_top_up_stay_reserve(uuid, numeric) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.guest_activate_stay_reserve(uuid, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_approve_stay_service_request(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_approve_store_quote(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_checkout_boutique(uuid, jsonb, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_create_stay_service_request(uuid, text, text, text, date, numeric, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_send_stay_message(uuid, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_top_up_stay_reserve(uuid, numeric) TO anon, authenticated;
