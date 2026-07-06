-- Phase 4.2 — Expenses (dépenses avec justificatifs)
-- Property-scoped operational expenses recorded by staff with an optional
-- receipt image (justificatif). Workflow: pending → approved / rejected,
-- restricted to owners. Access follows property assignment: owners see
-- everything, staff only their assigned villas.

-- Allow the 'expense' notification type.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['reservation','task','payment','system','service_request','incident','work_order','inspection','inventory','expense']));

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('cleaning','maintenance','supplies','utilities','staff','other')),
  vendor TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  receipt_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_property ON public.expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON public.expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property staff read expenses"
  ON expenses FOR SELECT TO authenticated
  USING (can_access_property(property_id));

CREATE POLICY "Property staff create expenses"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (can_access_property(property_id) AND created_by = auth.uid());

CREATE POLICY "Property staff update expenses"
  ON expenses FOR UPDATE TO authenticated
  USING (can_access_property(property_id))
  WITH CHECK (can_access_property(property_id));

CREATE POLICY "Owners delete expenses"
  ON expenses FOR DELETE TO authenticated
  USING (is_app_owner());

-- Keep updated_at / reviewed_* coherent with the status workflow, and
-- restrict approval/rejection to owners.
CREATE OR REPLACE FUNCTION public.expenses_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('approved','rejected') AND NOT public.is_app_owner() THEN
      RAISE EXCEPTION 'Only owners can approve or reject an expense';
    END IF;
    IF NEW.status IN ('approved','rejected') THEN
      NEW.reviewed_by := auth.uid();
      NEW.reviewed_at := now();
    ELSE
      NEW.reviewed_by := NULL;
      NEW.reviewed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_touch ON public.expenses;
CREATE TRIGGER trg_expenses_touch
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_touch();

-- Fan expense notifications out to the villa's staff + owners, excluding
-- the acting user (same targeting model as notify_work_order_recipients).
CREATE OR REPLACE FUNCTION public.notify_expense_recipients()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID := COALESCE(auth.uid(), NEW.created_by);
  ttl TEXT;
  msg TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    ttl := 'New expense';
    msg := 'Expense recorded: ' || NEW.label || ' (€' || NEW.amount || ')';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    ttl := 'Expense ' || NEW.status;
    msg := 'Expense "' || NEW.label || '" (€' || NEW.amount || ') was ' || NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
  SELECT DISTINCT r.uid, 'expense', ttl, msg,
         jsonb_build_object('label', NEW.label, 'amount', NEW.amount, 'status', NEW.status), NEW.id, false
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

DROP TRIGGER IF EXISTS trg_notify_expense_recipients ON public.expenses;
CREATE TRIGGER trg_notify_expense_recipients
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.notify_expense_recipients();
