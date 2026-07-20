-- Phase 3.2 — Work orders (ordres de mission prestataires)
-- Dispatch jobs to service providers from the directory, optionally linked to
-- an incident or a task. Workflow: sent → quote_received → validated →
-- completed (or cancelled), with quote/final cost tracking. Access follows
-- property assignment: owners see everything, staff only their assigned villas.

-- Allow the 'work_order' notification type.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['reservation','task','payment','system','service_request','incident','work_order']));

CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','quote_received','validated','completed','cancelled')),
  quote_amount NUMERIC(10,2),
  final_cost NUMERIC(10,2),
  scheduled_date DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_property ON public.work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_incident ON public.work_orders(incident_id);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property staff read work orders"
  ON work_orders FOR SELECT TO authenticated
  USING (can_access_property(property_id));

CREATE POLICY "Property staff create work orders"
  ON work_orders FOR INSERT TO authenticated
  WITH CHECK (can_access_property(property_id) AND created_by = auth.uid());

CREATE POLICY "Property staff update work orders"
  ON work_orders FOR UPDATE TO authenticated
  USING (can_access_property(property_id))
  WITH CHECK (can_access_property(property_id));

CREATE POLICY "Owners delete work orders"
  ON work_orders FOR DELETE TO authenticated
  USING (is_app_owner());

-- Keep updated_at / completed_at coherent with the status workflow, and
-- restrict quote validation to owners.
CREATE OR REPLACE FUNCTION public.work_orders_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'validated' AND NOT public.is_app_owner() THEN
      RAISE EXCEPTION 'Only owners can validate a quote';
    END IF;
    IF NEW.status = 'completed' THEN
      NEW.completed_at := now();
    ELSE
      NEW.completed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_orders_touch ON public.work_orders;
CREATE TRIGGER trg_work_orders_touch
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.work_orders_touch();

-- Fan work-order notifications out to the villa's staff + owners, excluding
-- the acting user (same targeting model as notify_incident_recipients).
CREATE OR REPLACE FUNCTION public.notify_work_order_recipients()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID := COALESCE(auth.uid(), NEW.created_by);
  ttl TEXT;
  msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ttl := 'New work order';
    msg := 'Work order sent to provider: ' || NEW.title;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    ttl := 'Work order ' || replace(NEW.status, '_', ' ');
    msg := 'Work order "' || NEW.title || '" is now ' || replace(NEW.status, '_', ' ');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
  SELECT DISTINCT r.uid, 'work_order', ttl, msg,
         jsonb_build_object('title', NEW.title, 'status', NEW.status), NEW.id, false
  FROM (
    SELECT ra.user_id AS uid
      FROM public.role_assignments ra
      WHERE ra.property_id = NEW.property_id
    UNION
    SELECT p.id
      FROM public.profiles p
      WHERE p.role = 'owner'
  ) r
  WHERE r.uid IS NOT NULL
    AND r.uid IS DISTINCT FROM actor;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_work_order_recipients ON public.work_orders;
CREATE TRIGGER trg_notify_work_order_recipients
  AFTER INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_work_order_recipients();
