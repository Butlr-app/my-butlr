CREATE TABLE IF NOT EXISTS public.property_pricing_settings (
  property_id uuid PRIMARY KEY REFERENCES public.properties(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP', 'CHF')),
  base_rate numeric(10,2) NOT NULL DEFAULT 0 CHECK (base_rate >= 0),
  weekend_rate numeric(10,2) CHECK (weekend_rate IS NULL OR weekend_rate >= 0),
  cleaning_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (cleaning_fee >= 0),
  security_deposit numeric(10,2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
  tourist_tax_per_person numeric(10,2) NOT NULL DEFAULT 0 CHECK (tourist_tax_per_person >= 0),
  extra_guest_fee numeric(10,2) NOT NULL DEFAULT 0 CHECK (extra_guest_fee >= 0),
  extra_guest_after integer NOT NULL DEFAULT 1 CHECK (extra_guest_after >= 1),
  minimum_stay integer NOT NULL DEFAULT 1 CHECK (minimum_stay >= 1),
  maximum_stay integer CHECK (maximum_stay IS NULL OR maximum_stay >= minimum_stay),
  check_in_time time NOT NULL DEFAULT '16:00',
  check_out_time time NOT NULL DEFAULT '10:00',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.property_rate_seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  start_date date NOT NULL,
  end_date date NOT NULL,
  nightly_rate numeric(10,2) NOT NULL CHECK (nightly_rate >= 0),
  weekend_rate numeric(10,2) CHECK (weekend_rate IS NULL OR weekend_rate >= 0),
  minimum_stay integer NOT NULL DEFAULT 1 CHECK (minimum_stay >= 1),
  weekly_discount numeric(5,2) NOT NULL DEFAULT 0 CHECK (weekly_discount BETWEEN 0 AND 100),
  monthly_discount numeric(5,2) NOT NULL DEFAULT 0 CHECK (monthly_discount BETWEEN 0 AND 100),
  priority integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT 'slate'
    CHECK (color IN ('slate', 'blue', 'green', 'amber', 'rose', 'violet')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS property_rate_seasons_property_dates_idx
  ON public.property_rate_seasons (property_id, start_date, end_date);

CREATE TABLE IF NOT EXISTS public.property_rate_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date date NOT NULL,
  nightly_rate numeric(10,2) CHECK (nightly_rate IS NULL OR nightly_rate >= 0),
  minimum_stay integer CHECK (minimum_stay IS NULL OR minimum_stay >= 1),
  availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'blocked', 'closed_to_arrival', 'closed_to_departure')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, date)
);

CREATE INDEX IF NOT EXISTS property_rate_overrides_property_date_idx
  ON public.property_rate_overrides (property_id, date);

ALTER TABLE public.property_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_rate_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_rate_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pricing settings access by property" ON public.property_pricing_settings;
CREATE POLICY "Pricing settings access by property"
ON public.property_pricing_settings
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Pricing seasons access by property" ON public.property_rate_seasons;
CREATE POLICY "Pricing seasons access by property"
ON public.property_rate_seasons
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Pricing overrides access by property" ON public.property_rate_overrides;
CREATE POLICY "Pricing overrides access by property"
ON public.property_rate_overrides
FOR ALL
TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

INSERT INTO public.property_pricing_settings (property_id)
SELECT id
FROM public.properties
ON CONFLICT (property_id) DO NOTHING;
