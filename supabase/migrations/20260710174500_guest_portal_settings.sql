-- Guest portal settings per property.

CREATE TABLE IF NOT EXISTS public.property_guest_portal_settings (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  welcome_title text,
  welcome_message text,
  wifi_name text,
  wifi_password text,
  check_in_instructions text,
  check_out_instructions text,
  house_rules text,
  emergency_contact text,
  require_online_checkin boolean NOT NULL DEFAULT true,
  show_services boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.property_guest_portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guest portal settings by property access"
  ON public.property_guest_portal_settings;

CREATE POLICY "Guest portal settings by property access"
ON public.property_guest_portal_settings
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));
