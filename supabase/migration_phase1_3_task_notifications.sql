-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 1.3 — Targeted task notifications
-- ═══════════════════════════════════════════════════════════════════════════════
-- Previously the client inserted a single notification with user_id = NULL on
-- task creation, broadcasting "New task assigned" to every authenticated user
-- (the notifications SELECT policy exposes user_id IS NULL rows to everyone).
--
-- This trigger fans a task-creation notification out to the relevant recipients
-- only, running as SECURITY DEFINER so it works regardless of who creates the
-- task (an assigned house_manager cannot read other users' role_assignments):
--   * NEW.assigned_to set        → that user
--   * else, task has property_id → staff assigned to the property + all owners
--   * else                       → all owners
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_task_recipients()
RETURNS TRIGGER AS $$
DECLARE
  msg TEXT := 'Task: ' || NEW.title || COALESCE(' (due ' || NEW.due_date::text || ')', '');
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
    VALUES (NEW.assigned_to, 'task', 'New task assigned', msg,
            jsonb_build_object('title', NEW.title), NEW.id, false);
  ELSE
    INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
    SELECT DISTINCT r.uid, 'task', 'New task assigned', msg,
           jsonb_build_object('title', NEW.title), NEW.id, false
    FROM (
      SELECT ra.user_id AS uid
        FROM public.role_assignments ra
        WHERE NEW.property_id IS NOT NULL AND ra.property_id = NEW.property_id
      UNION
      SELECT p.id
        FROM public.profiles p
        WHERE p.role = 'owner'
    ) r
    WHERE r.uid IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_task_recipients ON public.tasks;
CREATE TRIGGER trg_notify_task_recipients
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_recipients();
