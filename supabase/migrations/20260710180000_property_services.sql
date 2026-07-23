-- Property-specific service catalog configuration.

CREATE TABLE IF NOT EXISTS public.property_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  custom_price numeric(10, 2),
  custom_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, service_id)
);

CREATE INDEX IF NOT EXISTS property_services_property_id_idx
  ON public.property_services (property_id);

ALTER TABLE public.property_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Property services by property access" ON public.property_services;

CREATE POLICY "Property services by property access"
ON public.property_services
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));
