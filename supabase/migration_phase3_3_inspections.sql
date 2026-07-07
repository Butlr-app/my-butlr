-- Phase 3.3 — Inspections / états des lieux
-- Turn the existing inspections module into proper check-in/check-out walk-
-- throughs: typed inspections, inspector signature required to complete,
-- property-scoped RLS (owners see everything, staff only their assigned
-- villas) and targeted notifications on creation/completion.

-- Allow the 'inspection' notification type.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['reservation','task','payment','system','service_request','incident','work_order','inspection']));

ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS inspection_type TEXT NOT NULL DEFAULT 'routine'
    CHECK (inspection_type IN ('check_in','check_out','routine')),
  ADD COLUMN IF NOT EXISTS signature_data TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Property-scoped RLS replacing the permissive prototype policies.
DROP POLICY IF EXISTS "Allow all on inspections" ON public.inspections;
DROP POLICY IF EXISTS "Allow all on inspection_rooms" ON public.inspection_rooms;
DROP POLICY IF EXISTS "Allow all on inspection_reports" ON public.inspection_reports;

CREATE POLICY "Property staff read inspections"
  ON inspections FOR SELECT TO authenticated
  USING ((property_id IS NULL AND is_app_owner()) OR can_access_property(property_id));

CREATE POLICY "Property staff create inspections"
  ON inspections FOR INSERT TO authenticated
  WITH CHECK (
    ((property_id IS NULL AND is_app_owner()) OR can_access_property(property_id))
    AND created_by = auth.uid()
  );

CREATE POLICY "Property staff update inspections"
  ON inspections FOR UPDATE TO authenticated
  USING ((property_id IS NULL AND is_app_owner()) OR can_access_property(property_id))
  WITH CHECK ((property_id IS NULL AND is_app_owner()) OR can_access_property(property_id));

CREATE POLICY "Owners delete inspections"
  ON inspections FOR DELETE TO authenticated
  USING (is_app_owner());

CREATE POLICY "Property staff manage inspection rooms"
  ON inspection_rooms FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_rooms.inspection_id
      AND ((i.property_id IS NULL AND is_app_owner()) OR can_access_property(i.property_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_rooms.inspection_id
      AND ((i.property_id IS NULL AND is_app_owner()) OR can_access_property(i.property_id))
  ));

CREATE POLICY "Property staff manage inspection reports"
  ON inspection_reports FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_reports.inspection_id
      AND ((i.property_id IS NULL AND is_app_owner()) OR can_access_property(i.property_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inspections i
    WHERE i.id = inspection_reports.inspection_id
      AND ((i.property_id IS NULL AND is_app_owner()) OR can_access_property(i.property_id))
  ));

-- Keep updated_at / completed_at coherent and require a signature to complete.
CREATE OR REPLACE FUNCTION public.inspections_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' THEN
      IF NEW.signature_data IS NULL THEN
        RAISE EXCEPTION 'Signature required to complete an inspection';
      END IF;
      NEW.completed_at := now();
    ELSE
      NEW.completed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inspections_touch ON public.inspections;
CREATE TRIGGER trg_inspections_touch
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.inspections_touch();

-- Fan inspection notifications out to the villa's staff + owners, excluding
-- the acting user (same targeting model as notify_work_order_recipients).
CREATE OR REPLACE FUNCTION public.notify_inspection_recipients()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID := COALESCE(auth.uid(), NEW.created_by);
  ttl TEXT;
  msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ttl := 'New inspection';
    msg := 'Inspection started by ' || NEW.inspector_name;
  ELSIF NEW.status = 'completed' AND NEW.status IS DISTINCT FROM OLD.status THEN
    ttl := 'Inspection completed';
    msg := 'Inspection by ' || NEW.inspector_name || ' has been completed and signed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
  SELECT DISTINCT r.uid, 'inspection', ttl, msg,
         jsonb_build_object('inspector_name', NEW.inspector_name, 'inspection_type', NEW.inspection_type, 'status', NEW.status), NEW.id, false
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

DROP TRIGGER IF EXISTS trg_notify_inspection_recipients ON public.inspections;
CREATE TRIGGER trg_notify_inspection_recipients
  AFTER INSERT OR UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.notify_inspection_recipients();
