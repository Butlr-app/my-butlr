-- Phase 9.2 — Per-villa monthly budget tracking
-- Owners set a monthly spending budget per villa; actual spend is derived from
-- approved expenses. A SECURITY DEFINER trigger raises a single overspend
-- notification to owners the moment an approved expense pushes the month over
-- budget (it does not re-alert on subsequent expenses in the same month).

-- ─── budgets ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,  -- first day of the budgeted month
  amount       NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, period_month)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read budgets" ON public.budgets;
CREATE POLICY "Staff read budgets"
  ON public.budgets FOR SELECT TO authenticated
  USING (public.is_app_owner() OR public.can_access_property(property_id));

DROP POLICY IF EXISTS "Owners manage budgets" ON public.budgets;
CREATE POLICY "Owners manage budgets"
  ON public.budgets FOR ALL TO authenticated
  USING (public.is_app_owner())
  WITH CHECK (public.is_app_owner());

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.fn_budgets_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_budgets_touch ON public.budgets;
CREATE TRIGGER trg_budgets_touch
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.fn_budgets_touch();

-- ─── Overspend alert ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_check_budget_overspend()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month      DATE;
  v_budget     NUMERIC;
  v_new_total  NUMERIC;
  v_prev_total NUMERIC;
BEGIN
  -- Only act when an expense becomes (or is created) approved.
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND OLD.amount = NEW.amount
     AND OLD.expense_date = NEW.expense_date THEN
    RETURN NEW;
  END IF;

  v_month := date_trunc('month', NEW.expense_date)::date;

  SELECT amount INTO v_budget
  FROM public.budgets
  WHERE property_id = NEW.property_id AND period_month = v_month;

  IF v_budget IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_new_total
  FROM public.expenses
  WHERE property_id = NEW.property_id
    AND status = 'approved'
    AND date_trunc('month', expense_date)::date = v_month;

  v_prev_total := v_new_total - NEW.amount;

  -- Fire only on the crossing from within-budget to over-budget.
  IF v_prev_total <= v_budget AND v_new_total > v_budget THEN
    INSERT INTO public.notifications (user_id, type, title, message, read, data)
    SELECT p.id, 'expense', 'Budget exceeded',
           (SELECT name FROM public.properties WHERE id = NEW.property_id)
             || ' is over budget for ' || to_char(v_month, 'Mon YYYY')
             || ' (' || round(v_new_total)::text || ' / ' || round(v_budget)::text || ')',
           false,
           jsonb_build_object('property_id', NEW.property_id, 'period_month', v_month,
                              'budget', v_budget, 'spent', v_new_total)
    FROM public.profiles p
    WHERE p.role = 'owner';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_budget_overspend ON public.expenses;
CREATE TRIGGER trg_check_budget_overspend
  AFTER INSERT OR UPDATE OF status, amount, expense_date ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_budget_overspend();
