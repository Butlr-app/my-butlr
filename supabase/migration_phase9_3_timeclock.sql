-- Phase 9.3 — Time clock-in / clock-out tied to team planning
-- Staff clock in against an assigned villa (optionally linked to a planned
-- shift) and clock out later; owners get a per-villa timesheet. A partial
-- unique index guarantees a single open entry per user.

CREATE TABLE IF NOT EXISTS public.time_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_id    UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out   TIMESTAMPTZ,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

-- one open (not-yet-clocked-out) entry per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_time_entries_open
  ON public.time_entries (user_id) WHERE clock_out IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_property ON public.time_entries (property_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries (user_id);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Owners see everything; staff see their own entries.
DROP POLICY IF EXISTS "Read time entries" ON public.time_entries;
CREATE POLICY "Read time entries"
  ON public.time_entries FOR SELECT TO authenticated
  USING (public.is_app_owner() OR user_id = auth.uid());

-- Staff clock in only for themselves on an assigned villa; owners unrestricted.
DROP POLICY IF EXISTS "Clock in time entries" ON public.time_entries;
CREATE POLICY "Clock in time entries"
  ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (
    public.is_app_owner()
    OR (user_id = auth.uid() AND public.can_access_property(property_id))
  );

-- Clock out / edit own entry; owners can adjust any.
DROP POLICY IF EXISTS "Update time entries" ON public.time_entries;
CREATE POLICY "Update time entries"
  ON public.time_entries FOR UPDATE TO authenticated
  USING (public.is_app_owner() OR user_id = auth.uid())
  WITH CHECK (public.is_app_owner() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Delete time entries" ON public.time_entries;
CREATE POLICY "Delete time entries"
  ON public.time_entries FOR DELETE TO authenticated
  USING (public.is_app_owner() OR user_id = auth.uid());
