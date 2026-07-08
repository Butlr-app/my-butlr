-- ═══════════════════════════════════════════════════════════════════════════════
-- Partners Phase 5 — Business logic for the prestataire feature
-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Partner-owned services: services.partner_id (NULL = global platform catalog).
--    A partner may CRUD only their own services; staff manage everything; reads
--    stay open (guests/concierge see the catalog as before).
-- 2. partner_availability: a partner's weekly working hours.
-- 3. partner_reviews: guest ratings for a partner; a trigger keeps
--    partners.rating in sync (computed average, no longer a static value).
-- 4. partner_documents: metadata for files a partner uploads (contracts,
--    certificates…). Files live in the existing public "images" bucket under a
--    partner-documents/ prefix, mirroring the villa document vault.
-- 5. partners.bookings_count is recomputed from completed service_requests.
-- Relies on public.is_app_staff() / is_app_owner() / current_partner_id().
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Partner-owned services ───────────────────────────────────────────────

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_services_partner ON public.services (partner_id);

-- Reads stay open; tighten writes so a partner touches only their own services.
DROP POLICY IF EXISTS "Authenticated manage services" ON public.services;

CREATE POLICY "Staff manage services"
  ON public.services FOR ALL TO authenticated
  USING (public.is_app_staff())
  WITH CHECK (public.is_app_staff());

CREATE POLICY "Partner manages own services"
  ON public.services FOR ALL TO authenticated
  USING (partner_id = public.current_partner_id())
  WITH CHECK (partner_id = public.current_partner_id());

-- ─── 2. Partner availability (weekly hours) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time  TIME NOT NULL DEFAULT '09:00',
  end_time    TIME NOT NULL DEFAULT '17:00',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_availability_day
  ON public.partner_availability (partner_id, weekday);

ALTER TABLE public.partner_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff or own partner reads availability" ON public.partner_availability;
CREATE POLICY "Staff or own partner reads availability"
  ON public.partner_availability FOR SELECT TO authenticated
  USING (public.is_app_staff() OR partner_id = public.current_partner_id());

DROP POLICY IF EXISTS "Staff or own partner writes availability" ON public.partner_availability;
CREATE POLICY "Staff or own partner writes availability"
  ON public.partner_availability FOR ALL TO authenticated
  USING (public.is_app_staff() OR partner_id = public.current_partner_id())
  WITH CHECK (public.is_app_staff() OR partner_id = public.current_partner_id());

-- ─── 3. Partner reviews (drive computed rating) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_reviews (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id         UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  guest_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating             SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment            TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_reviews_partner ON public.partner_reviews (partner_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_reviews_request
  ON public.partner_reviews (service_request_id) WHERE service_request_id IS NOT NULL;

ALTER TABLE public.partner_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read partner reviews" ON public.partner_reviews;
CREATE POLICY "Read partner reviews"
  ON public.partner_reviews FOR SELECT TO authenticated
  USING (
    public.is_app_staff()
    OR partner_id = public.current_partner_id()
    OR guest_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Guest or staff create partner reviews" ON public.partner_reviews;
CREATE POLICY "Guest or staff create partner reviews"
  ON public.partner_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_app_staff() OR guest_user_id = auth.uid());

DROP POLICY IF EXISTS "Author or staff update partner reviews" ON public.partner_reviews;
CREATE POLICY "Author or staff update partner reviews"
  ON public.partner_reviews FOR UPDATE TO authenticated
  USING (public.is_app_staff() OR guest_user_id = auth.uid())
  WITH CHECK (public.is_app_staff() OR guest_user_id = auth.uid());

DROP POLICY IF EXISTS "Author or staff delete partner reviews" ON public.partner_reviews;
CREATE POLICY "Author or staff delete partner reviews"
  ON public.partner_reviews FOR DELETE TO authenticated
  USING (public.is_app_staff() OR guest_user_id = auth.uid());

-- Keep partners.rating = average of its reviews (unchanged when it has none).
CREATE OR REPLACE FUNCTION public.recompute_partner_rating(pid UUID)
RETURNS VOID AS $$
  UPDATE public.partners p
     SET rating = COALESCE(
       (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.partner_reviews WHERE partner_id = pid),
       p.rating
     )
   WHERE p.id = pid;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trg_partner_reviews_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_partner_rating(OLD.partner_id);
    RETURN OLD;
  END IF;
  PERFORM public.recompute_partner_rating(NEW.partner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_partner_reviews_rating ON public.partner_reviews;
CREATE TRIGGER trg_partner_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.partner_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_partner_reviews_rating();

-- ─── 4. Partner documents ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('contract','certificate','insurance','license','other')),
  file_url    TEXT NOT NULL,
  file_name   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_documents_partner ON public.partner_documents (partner_id);

ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff or own partner reads documents" ON public.partner_documents;
CREATE POLICY "Staff or own partner reads documents"
  ON public.partner_documents FOR SELECT TO authenticated
  USING (public.is_app_staff() OR partner_id = public.current_partner_id());

DROP POLICY IF EXISTS "Staff or own partner writes documents" ON public.partner_documents;
CREATE POLICY "Staff or own partner writes documents"
  ON public.partner_documents FOR ALL TO authenticated
  USING (public.is_app_staff() OR partner_id = public.current_partner_id())
  WITH CHECK (public.is_app_staff() OR partner_id = public.current_partner_id());

-- ─── 5. Recompute bookings_count from completed requests ─────────────────────

CREATE OR REPLACE FUNCTION public.recompute_partner_bookings(pid UUID)
RETURNS VOID AS $$
  UPDATE public.partners p
     SET bookings_count = (
       SELECT COUNT(*) FROM public.service_requests
        WHERE partner_id = pid AND status = 'completed'
     )
   WHERE p.id = pid;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.trg_service_requests_bookings()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.partner_id IS NOT NULL THEN
    PERFORM public.recompute_partner_bookings(OLD.partner_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.partner_id IS NOT NULL THEN
    PERFORM public.recompute_partner_bookings(NEW.partner_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_service_requests_bookings ON public.service_requests;
CREATE TRIGGER trg_service_requests_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_service_requests_bookings();
