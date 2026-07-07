-- Phase 9.1 — Preventive maintenance scheduling
-- Owners define recurring maintenance plans per villa (boiler service, chimney
-- sweep, pool servicing…). A daily job (pg_cron, with an app-load fallback)
-- materialises a task when a plan falls due within its lead window, notifies the
-- owners + assignee, then advances the plan to its next occurrence. Generation
-- is idempotent thanks to a unique (maintenance_plan_id, due_date) index.

-- ─── maintenance_plans ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other'
                    CHECK (category IN ('hvac','plumbing','electrical','pool','garden','safety','appliance','other')),
  notes           TEXT,
  interval_months INTEGER NOT NULL DEFAULT 12 CHECK (interval_months BETWEEN 1 AND 60),
  lead_days       INTEGER NOT NULL DEFAULT 7 CHECK (lead_days BETWEEN 0 AND 90),
  next_due        DATE NOT NULL,
  last_generated  DATE,
  assigned_to     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read maintenance plans" ON public.maintenance_plans;
CREATE POLICY "Staff read maintenance plans"
  ON public.maintenance_plans FOR SELECT TO authenticated
  USING (public.is_app_owner() OR public.can_access_property(property_id));

DROP POLICY IF EXISTS "Owners manage maintenance plans" ON public.maintenance_plans;
CREATE POLICY "Owners manage maintenance plans"
  ON public.maintenance_plans FOR ALL TO authenticated
  USING (public.is_app_owner())
  WITH CHECK (public.is_app_owner());

-- ─── Provenance column on tasks (idempotent generation) ──────────────────────

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS maintenance_plan_id UUID
  REFERENCES public.maintenance_plans(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_maintenance_due
  ON public.tasks(maintenance_plan_id, due_date)
  WHERE maintenance_plan_id IS NOT NULL;

-- ─── Generation ──────────────────────────────────────────────────────────────
-- For every active plan due within its lead window: create the task (if not
-- already created), notify owners + assignee once, then roll the plan forward.

CREATE OR REPLACE FUNCTION public.generate_maintenance_tasks()
RETURNS INTEGER AS $$
DECLARE
  r        RECORD;
  v_task   UUID;
  created  INTEGER := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.maintenance_plans
    WHERE active AND next_due <= current_date + (lead_days || ' days')::interval
  LOOP
    INSERT INTO public.tasks (property_id, title, description, status, priority, assigned_to, due_date, maintenance_plan_id)
    VALUES (r.property_id, r.title, r.notes, 'todo', 'medium', r.assigned_to, r.next_due, r.id)
    ON CONFLICT (maintenance_plan_id, due_date)
      WHERE maintenance_plan_id IS NOT NULL
      DO NOTHING
    RETURNING id INTO v_task;

    IF v_task IS NOT NULL THEN
      created := created + 1;
      INSERT INTO public.notifications (user_id, type, title, message, read, data)
      SELECT p.id, 'task', 'Maintenance due',
             r.title || ' is due on ' || to_char(r.next_due, 'DD Mon YYYY'),
             false, jsonb_build_object('maintenance_plan_id', r.id, 'property_id', r.property_id)
      FROM public.profiles p
      WHERE p.role = 'owner' OR (r.assigned_to IS NOT NULL AND p.id = r.assigned_to);
    END IF;

    -- Roll forward to the next occurrence (unique index guards against dupes).
    UPDATE public.maintenance_plans
    SET next_due = r.next_due + (r.interval_months || ' months')::interval,
        last_generated = r.next_due
    WHERE id = r.id;
  END LOOP;

  RETURN created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.generate_maintenance_tasks() FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_maintenance_tasks() TO authenticated;

-- Best effort daily schedule; the Maintenance page also calls this on load.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('generate-maintenance-tasks', '0 4 * * *', 'SELECT public.generate_maintenance_tasks()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable, maintenance tasks generated on app load only';
END;
$$;
