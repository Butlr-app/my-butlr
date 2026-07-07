-- Phase 6.2 — Team planning (planning équipe)
-- Property-scoped work shifts assigned to team members. Owners manage the
-- schedule; staff read the shifts for their assigned villas. The assigned
-- member is notified when a shift is created or rescheduled.

-- Allow the 'shift' notification type.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['reservation','task','payment','system','service_request','incident','work_order','inspection','inventory','expense','shift']));

CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general','cleaning','checkin','checkout','maintenance')),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shifts_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_shifts_property ON public.shifts(property_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user ON public.shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON public.shifts(shift_date);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property staff read shifts"
  ON shifts FOR SELECT TO authenticated
  USING (can_access_property(property_id) OR user_id = auth.uid());

CREATE POLICY "Owners create shifts"
  ON shifts FOR INSERT TO authenticated
  WITH CHECK (is_app_owner());

CREATE POLICY "Owners update shifts"
  ON shifts FOR UPDATE TO authenticated
  USING (is_app_owner())
  WITH CHECK (is_app_owner());

CREATE POLICY "Owners delete shifts"
  ON shifts FOR DELETE TO authenticated
  USING (is_app_owner());

CREATE OR REPLACE FUNCTION public.shifts_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shifts_touch ON public.shifts;
CREATE TRIGGER trg_shifts_touch
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.shifts_touch();

-- Notify the assigned member when a shift is created for them, reassigned
-- to them, or rescheduled; the acting user is never notified.
CREATE OR REPLACE FUNCTION public.notify_shift_recipient()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID := COALESCE(auth.uid(), NEW.created_by);
  villa TEXT;
  ttl TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    ttl := 'New shift assigned';
  ELSIF NEW.shift_date IS DISTINCT FROM OLD.shift_date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.end_time IS DISTINCT FROM OLD.end_time THEN
    ttl := 'Shift updated';
  ELSE
    RETURN NEW;
  END IF;

  SELECT name INTO villa FROM public.properties WHERE id = NEW.property_id;

  IF NEW.user_id IS DISTINCT FROM actor THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
    VALUES (
      NEW.user_id, 'shift', ttl,
      COALESCE(villa, 'Villa') || ' — ' || NEW.shift_date || ' ' ||
        to_char(NEW.start_time, 'HH24:MI') || '–' || to_char(NEW.end_time, 'HH24:MI') || ' (' || NEW.type || ')',
      jsonb_build_object('property_id', NEW.property_id, 'shift_date', NEW.shift_date, 'type', NEW.type),
      NEW.id, false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_shift_recipient ON public.shifts;
CREATE TRIGGER trg_notify_shift_recipient
  AFTER INSERT OR UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.notify_shift_recipient();
