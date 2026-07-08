-- Phase 9.4 — Service provider ratings & SLA tracking
-- Staff rate a provider after a completed work order (1–5 stars + comment).
-- SLA metrics (average completion time) are derived client-side from
-- work_orders.created_at → completed_at.

CREATE TABLE IF NOT EXISTS public.provider_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  property_id   UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- at most one rating per work order
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_ratings_work_order
  ON public.provider_ratings (work_order_id) WHERE work_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_ratings_provider ON public.provider_ratings (provider_id);

ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read provider ratings" ON public.provider_ratings;
CREATE POLICY "Read provider ratings"
  ON public.provider_ratings FOR SELECT TO authenticated
  USING (public.is_app_owner() OR public.can_access_property(property_id));

DROP POLICY IF EXISTS "Create provider ratings" ON public.provider_ratings;
CREATE POLICY "Create provider ratings"
  ON public.provider_ratings FOR INSERT TO authenticated
  WITH CHECK (public.is_app_owner() OR public.can_access_property(property_id));

DROP POLICY IF EXISTS "Update provider ratings" ON public.provider_ratings;
CREATE POLICY "Update provider ratings"
  ON public.provider_ratings FOR UPDATE TO authenticated
  USING (public.is_app_owner() OR created_by = auth.uid())
  WITH CHECK (public.is_app_owner() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Delete provider ratings" ON public.provider_ratings;
CREATE POLICY "Delete provider ratings"
  ON public.provider_ratings FOR DELETE TO authenticated
  USING (public.is_app_owner() OR created_by = auth.uid());
