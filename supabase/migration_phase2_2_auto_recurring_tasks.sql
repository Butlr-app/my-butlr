-- Phase 2.2 — Automatic (check-out) & recurring tasks
-- Task templates drive auto-generation: 'checkout' templates instantiate a task
-- at each reservation check-out; 'recurring' templates instantiate one task per
-- period (daily/weekly/monthly) via generate_recurring_tasks().

-- ─── task_templates ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE, -- NULL = all properties
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('checkout','recurring')),
  recurrence TEXT CHECK (recurrence IN ('daily','weekly','monthly')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recurrence_required CHECK (trigger_type <> 'recurring' OR recurrence IS NOT NULL)
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read task templates"
  ON task_templates FOR SELECT TO authenticated
  USING (property_id IS NULL OR can_access_property(property_id));

CREATE POLICY "Owners manage task templates"
  ON task_templates FOR ALL TO authenticated
  USING (is_app_owner())
  WITH CHECK (is_app_owner());

-- ─── Provenance columns on tasks (idempotent generation) ────────────────────

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL;

-- one checkout task per (template, reservation)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_template_reservation
  ON public.tasks(template_id, reservation_id)
  WHERE template_id IS NOT NULL AND reservation_id IS NOT NULL;

-- one recurring task per (template, period due date)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_template_due
  ON public.tasks(template_id, due_date)
  WHERE template_id IS NOT NULL AND reservation_id IS NULL;

-- ─── Check-out task generation ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_checkout_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    DELETE FROM public.tasks
    WHERE reservation_id = NEW.id AND template_id IS NOT NULL AND status = 'todo';
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('confirmed', 'in_progress') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tasks (property_id, title, description, status, priority, assigned_to, due_date, template_id, reservation_id)
  SELECT NEW.property_id, tt.title, tt.description, 'todo', tt.priority, tt.assigned_to, NEW.departure, tt.id, NEW.id
  FROM public.task_templates tt
  WHERE tt.active
    AND tt.trigger_type = 'checkout'
    AND (tt.property_id IS NULL OR tt.property_id = NEW.property_id)
  ON CONFLICT (template_id, reservation_id)
    WHERE template_id IS NOT NULL AND reservation_id IS NOT NULL
    DO NOTHING;

  -- keep pending generated tasks in sync when the departure date moves
  UPDATE public.tasks
  SET due_date = NEW.departure
  WHERE reservation_id = NEW.id
    AND template_id IS NOT NULL
    AND status <> 'done'
    AND due_date IS DISTINCT FROM NEW.departure;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_generate_checkout_tasks ON public.reservations;
CREATE TRIGGER trg_generate_checkout_tasks
  AFTER INSERT OR UPDATE OF status, departure, property_id ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.generate_checkout_tasks();

-- ─── Recurring task generation ───────────────────────────────────────────────
-- Instantiates one task per active recurring template for the current period.
-- Due date is the period end (today / Sunday / last day of month), which also
-- acts as the idempotency key. Safe to call any number of times.

CREATE OR REPLACE FUNCTION public.generate_recurring_tasks()
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  INSERT INTO public.tasks (property_id, title, description, status, priority, assigned_to, due_date, template_id)
  SELECT tt.property_id, tt.title, tt.description, 'todo', tt.priority, tt.assigned_to,
    CASE tt.recurrence
      WHEN 'daily' THEN current_date
      WHEN 'weekly' THEN (date_trunc('week', current_date) + INTERVAL '6 days')::date
      WHEN 'monthly' THEN (date_trunc('month', current_date) + INTERVAL '1 month - 1 day')::date
    END,
    tt.id
  FROM public.task_templates tt
  WHERE tt.active AND tt.trigger_type = 'recurring'
  ON CONFLICT (template_id, due_date)
    WHERE template_id IS NOT NULL AND reservation_id IS NULL
    DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.generate_recurring_tasks() FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_recurring_tasks() TO authenticated;

-- Best effort: schedule daily generation server-side when pg_cron is available.
-- The app also calls generate_recurring_tasks() on Tasks page load as a fallback.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('generate-recurring-tasks', '0 3 * * *', 'SELECT public.generate_recurring_tasks()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable, recurring tasks generated on app load only';
END;
$$;
