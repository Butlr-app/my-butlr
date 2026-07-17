-- Opt-in property discovery for guests whose stay has ended.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS marketplace_listed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketplace_booking_url text,
  ADD COLUMN IF NOT EXISTS marketplace_tagline text;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_marketplace_booking_url_check,
  ADD CONSTRAINT properties_marketplace_booking_url_check
    CHECK (
      marketplace_booking_url IS NULL
      OR marketplace_booking_url ~* '^https://'
    );

COMMENT ON COLUMN public.properties.marketplace_listed IS
  'Owner opt-in for the post-stay My Butlr property showcase.';
COMMENT ON COLUMN public.properties.marketplace_booking_url IS
  'Public HTTPS booking or enquiry URL shown to former guests.';

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.guest_get_recommended_properties(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  stay public.reservations;
  recommendations jsonb;
BEGIN
  IF p_token IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token', 'properties', '[]'::jsonb);
  END IF;

  SELECT reservation.*
  INTO stay
  FROM public.reservations reservation
  WHERE reservation.portal_access_token = p_token
  LIMIT 1;

  IF stay.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token', 'properties', '[]'::jsonb);
  END IF;

  IF current_date <= stay.departure THEN
    RETURN jsonb_build_object('error', 'stay_not_finished', 'properties', '[]'::jsonb);
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', property.id,
        'name', property.name,
        'location', property.location,
        'type', property.type,
        'bedrooms', property.bedrooms,
        'max_guests', property.max_guests,
        'image_url', property.image_url,
        'tagline', property.marketplace_tagline,
        'booking_url', property.marketplace_booking_url
      )
      ORDER BY property.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO recommendations
  FROM (
    SELECT listed.*
    FROM public.properties listed
    WHERE listed.marketplace_listed = true
      AND listed.status = 'active'
      AND listed.id <> stay.property_id
      AND listed.marketplace_booking_url IS NOT NULL
    ORDER BY listed.created_at DESC
    LIMIT 6
  ) property;

  RETURN jsonb_build_object('properties', recommendations);
END;
$$;

CREATE OR REPLACE FUNCTION public.guest_get_recommended_properties(p_token uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog, public, private
AS $$
  SELECT private.guest_get_recommended_properties(p_token);
$$;

REVOKE ALL ON FUNCTION private.guest_get_recommended_properties(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guest_get_recommended_properties(uuid) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guest_get_recommended_properties(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guest_get_recommended_properties(uuid) TO anon, authenticated;
