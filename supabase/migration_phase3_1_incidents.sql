-- Phase 3.1 — Incidents
-- Maintenance / damage incidents per villa with urgency, status workflow and
-- targeted notifications. Access follows property assignment (same model as
-- tasks): owners see everything, staff only their assigned villas.

-- Allow the 'incident' notification type.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['reservation','task','payment','system','service_request','incident']));

CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('equipment','plumbing','electrical','damage','security','other')),
  urgency TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  photo_url TEXT,
  reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incidents_property ON public.incidents(property_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property staff read incidents"
  ON incidents FOR SELECT TO authenticated
  USING (can_access_property(property_id));

CREATE POLICY "Property staff report incidents"
  ON incidents FOR INSERT TO authenticated
  WITH CHECK (can_access_property(property_id) AND reported_by = auth.uid());

CREATE POLICY "Property staff update incidents"
  ON incidents FOR UPDATE TO authenticated
  USING (can_access_property(property_id))
  WITH CHECK (can_access_property(property_id));

CREATE POLICY "Owners delete incidents"
  ON incidents FOR DELETE TO authenticated
  USING (is_app_owner());

-- Keep updated_at / resolved_at coherent with the status workflow.
CREATE OR REPLACE FUNCTION public.incidents_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('resolved','closed') AND OLD.status NOT IN ('resolved','closed') THEN
    NEW.resolved_at := now();
  ELSIF NEW.status IN ('open','in_progress') THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incidents_touch ON public.incidents;
CREATE TRIGGER trg_incidents_touch
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.incidents_touch();

-- Fan a new-incident notification out to the villa's staff + owners,
-- excluding the reporter (same targeting model as notify_task_recipients).
CREATE OR REPLACE FUNCTION public.notify_incident_recipients()
RETURNS TRIGGER AS $$
DECLARE
  msg TEXT := 'Incident: ' || NEW.title || ' (' || NEW.urgency || ')';
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
  SELECT DISTINCT r.uid, 'incident', 'New incident reported', msg,
         jsonb_build_object('title', NEW.title, 'urgency', NEW.urgency), NEW.id, false
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
    AND r.uid IS DISTINCT FROM NEW.reported_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_incident_recipients ON public.incidents;
CREATE TRIGGER trg_notify_incident_recipients
  AFTER INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.notify_incident_recipients();
