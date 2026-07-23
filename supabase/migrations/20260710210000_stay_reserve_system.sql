-- Réserve séjour (APR internal) — V1

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS portal_access_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS reservations_portal_access_token_idx
  ON public.reservations (portal_access_token);

-- ─── Stay Reserve ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stay_reserves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'EUR',
  recommended_amount numeric(12,2),
  initial_amount numeric(12,2) NOT NULL DEFAULT 0,
  current_balance numeric(12,2) NOT NULL DEFAULT 0,
  spent_amount numeric(12,2) NOT NULL DEFAULT 0,
  pending_amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'funded', 'partially_used', 'low_balance',
      'exhausted', 'closed', 'refunded', 'cancelled'
    )),
  approval_mode text NOT NULL DEFAULT 'auto_under_limit'
    CHECK (approval_mode IN ('manual', 'auto_under_limit')),
  auto_approval_limit numeric(12,2) NOT NULL DEFAULT 300,
  notification_before_spending boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS stay_reserves_property_id_idx ON public.stay_reserves (property_id);
CREATE INDEX IF NOT EXISTS stay_reserves_status_idx ON public.stay_reserves (status);

-- ─── Service requests (stay) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stay_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  stay_reserve_id uuid NOT NULL REFERENCES public.stay_reserves(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  house_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES public.service_providers(id) ON DELETE SET NULL,
  property_service_id uuid REFERENCES public.property_services(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  requested_date date,
  urgency text NOT NULL DEFAULT 'normal'
    CHECK (urgency IN ('low', 'normal', 'high')),
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft', 'submitted', 'reviewing', 'quoted', 'waiting_client_approval',
      'approved', 'assigned_to_provider', 'in_progress', 'completed',
      'cancelled', 'disputed'
    )),
  estimated_amount numeric(12,2),
  final_amount numeric(12,2),
  provider_name text,
  approved_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stay_service_requests_reserve_id_idx
  ON public.stay_service_requests (stay_reserve_id);
CREATE INDEX IF NOT EXISTS stay_service_requests_status_idx
  ON public.stay_service_requests (status);

-- ─── Reserve transactions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reserve_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_reserve_id uuid NOT NULL REFERENCES public.stay_reserves(id) ON DELETE CASCADE,
  service_request_id uuid REFERENCES public.stay_service_requests(id) ON DELETE SET NULL,
  type text NOT NULL
    CHECK (type IN (
      'top_up', 'authorization', 'capture', 'refund',
      'release', 'adjustment', 'payout', 'commission'
    )),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reserve_transactions_reserve_id_idx
  ON public.reserve_transactions (stay_reserve_id);

-- ─── Revenue splits ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_revenue_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL UNIQUE REFERENCES public.stay_service_requests(id) ON DELETE CASCADE,
  total_amount numeric(12,2) NOT NULL,
  provider_amount numeric(12,2) NOT NULL DEFAULT 0,
  platform_commission numeric(12,2) NOT NULL DEFAULT 0,
  villa_amount numeric(12,2) NOT NULL DEFAULT 0,
  concierge_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_fees numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── End-of-stay statements ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reserve_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stay_reserve_id uuid NOT NULL REFERENCES public.stay_reserves(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  total_funded numeric(12,2) NOT NULL DEFAULT 0,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  total_refunded numeric(12,2) NOT NULL DEFAULT 0,
  remaining_balance numeric(12,2) NOT NULL DEFAULT 0,
  generated_at timestamptz NOT NULL DEFAULT now(),
  pdf_url text
);

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.stay_reserves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stay_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserve_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_revenue_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserve_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Property access stay_reserves" ON public.stay_reserves;
CREATE POLICY "Property access stay_reserves"
ON public.stay_reserves FOR ALL TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Property access stay_service_requests" ON public.stay_service_requests;
CREATE POLICY "Property access stay_service_requests"
ON public.stay_service_requests FOR ALL TO authenticated
USING (public.can_access_property(property_id))
WITH CHECK (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Property access reserve_transactions" ON public.reserve_transactions;
CREATE POLICY "Property access reserve_transactions"
ON public.reserve_transactions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stay_reserves reserve
    WHERE reserve.id = stay_reserve_id
      AND public.can_access_property(reserve.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stay_reserves reserve
    WHERE reserve.id = stay_reserve_id
      AND public.can_access_property(reserve.property_id)
  )
);

DROP POLICY IF EXISTS "Property access revenue_splits" ON public.service_revenue_splits;
CREATE POLICY "Property access revenue_splits"
ON public.service_revenue_splits FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stay_service_requests request
    WHERE request.id = service_request_id
      AND public.can_access_property(request.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stay_service_requests request
    WHERE request.id = service_request_id
      AND public.can_access_property(request.property_id)
  )
);

DROP POLICY IF EXISTS "Property access reserve_statements" ON public.reserve_statements;
CREATE POLICY "Property access reserve_statements"
ON public.reserve_statements FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stay_reserves reserve
    WHERE reserve.id = stay_reserve_id
      AND public.can_access_property(reserve.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stay_reserves reserve
    WHERE reserve.id = stay_reserve_id
      AND public.can_access_property(reserve.property_id)
  )
);

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recommend_stay_reserve_amount(
  p_nights integer,
  p_max_guests integer DEFAULT 4,
  p_property_type text DEFAULT 'villa'
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base numeric;
  per_night numeric;
BEGIN
  IF p_nights <= 0 THEN RETURN 1500; END IF;
  IF p_max_guests >= 12 OR p_property_type = 'yacht' THEN
    base := 7500;
    per_night := 800;
  ELSIF p_max_guests >= 8 THEN
    base := 3000;
    per_night := 350;
  ELSE
    base := 1500;
    per_night := 180;
  END IF;
  RETURN GREATEST(base, p_nights * per_night);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_stay_reserve_status(p_reserve_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.stay_reserves%ROWTYPE;
  low_threshold numeric := 500;
BEGIN
  SELECT * INTO r FROM public.stay_reserves WHERE id = p_reserve_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF r.status IN ('closed', 'refunded', 'cancelled') THEN RETURN; END IF;

  IF r.current_balance <= 0 AND r.initial_amount > 0 THEN
    UPDATE public.stay_reserves SET status = 'exhausted', updated_at = now() WHERE id = p_reserve_id;
  ELSIF r.current_balance > 0 AND r.current_balance < low_threshold AND r.spent_amount > 0 THEN
    UPDATE public.stay_reserves SET status = 'low_balance', updated_at = now() WHERE id = p_reserve_id;
  ELSIF r.spent_amount > 0 AND r.current_balance > 0 THEN
    UPDATE public.stay_reserves SET status = 'partially_used', updated_at = now() WHERE id = p_reserve_id;
  ELSIF r.current_balance > 0 AND r.initial_amount > 0 THEN
    UPDATE public.stay_reserves SET status = 'funded', updated_at = now() WHERE id = p_reserve_id;
  END IF;
END;
$$;

-- Guest portal access via reservation token (no auth required)
CREATE OR REPLACE FUNCTION public.get_guest_stay_portal(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res record;
  reserve record;
BEGIN
  SELECT r.*, p.name AS property_name, p.image_url AS property_image_url
  INTO res
  FROM public.reservations r
  JOIN public.properties p ON p.id = r.property_id
  WHERE r.portal_access_token = p_token
    AND r.booking_kind = 'guest'
    AND r.status <> 'cancelled';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT * INTO reserve FROM public.stay_reserves WHERE reservation_id = res.id;

  RETURN jsonb_build_object(
    'reservation', jsonb_build_object(
      'id', res.id,
      'guest_name', res.guest_name,
      'arrival', res.arrival,
      'departure', res.departure,
      'property_id', res.property_id,
      'property_name', res.property_name,
      'property_image_url', res.property_image_url
    ),
    'reserve', CASE WHEN reserve.id IS NULL THEN NULL ELSE to_jsonb(reserve) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_stay_portal(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_stay_reserve_amount(integer, integer, text) TO authenticated;
