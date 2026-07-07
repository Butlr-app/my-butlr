-- Phase 2.3 — Checklists
-- Reusable checklist templates (per category) instantiated onto tasks as
-- checkable items. Auto-generated tasks (Phase 2.2) can carry a checklist via
-- task_templates.checklist_template_id.

-- ─── checklist_templates ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('cleaning','checkin','checkout','maintenance','other')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of item labels
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read checklist templates"
  ON checklist_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Owners manage checklist templates"
  ON checklist_templates FOR ALL TO authenticated
  USING (is_app_owner())
  WITH CHECK (is_app_owner());

-- ─── task_checklist_items ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_checklist_items_task ON public.task_checklist_items(task_id);

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task participants read checklist items"
  ON task_checklist_items FOR SELECT TO authenticated
  USING (can_access_task(task_id));

CREATE POLICY "Task participants add checklist items"
  ON task_checklist_items FOR INSERT TO authenticated
  WITH CHECK (can_access_task(task_id));

CREATE POLICY "Task participants update checklist items"
  ON task_checklist_items FOR UPDATE TO authenticated
  USING (can_access_task(task_id))
  WITH CHECK (can_access_task(task_id));

CREATE POLICY "Task participants delete checklist items"
  ON task_checklist_items FOR DELETE TO authenticated
  USING (can_access_task(task_id));

-- ─── Checklist on task templates (auto tasks inherit it) ────────────────────

ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS checklist_template_id UUID REFERENCES public.checklist_templates(id) ON DELETE SET NULL;

-- When a task is generated from a task template carrying a checklist,
-- instantiate the checklist items on the new task.
CREATE OR REPLACE FUNCTION public.instantiate_task_checklist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.task_checklist_items (task_id, label, position)
  SELECT NEW.id, item.value, item.ordinality - 1
  FROM public.task_templates tt
  JOIN public.checklist_templates ct ON ct.id = tt.checklist_template_id
  CROSS JOIN LATERAL jsonb_array_elements_text(ct.items) WITH ORDINALITY AS item(value, ordinality)
  WHERE tt.id = NEW.template_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_instantiate_task_checklist ON public.tasks;
CREATE TRIGGER trg_instantiate_task_checklist
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.instantiate_task_checklist();
