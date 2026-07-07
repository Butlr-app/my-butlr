-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 2.1 — Task assignment + task comments
-- ═══════════════════════════════════════════════════════════════════════════════
-- * task_comments table with RLS scoped to who can access the parent task
-- * get_team_members() RPC so staff/owners can pick an assignee
--   (profiles RLS only allows reading one's own row)
-- * notification triggers: task reassignment + new comment fan-out

-- ─── Helper ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_access_task(t_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = t_id
      AND (public.can_access_property(t.property_id) OR t.assigned_to = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ─── Team members RPC ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, role TEXT) AS $$
  SELECT p.id, p.full_name, p.email, p.role
  FROM public.profiles p
  WHERE p.role IN ('owner', 'house_manager', 'concierge', 'agency')
  ORDER BY p.full_name NULLS LAST, p.email;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_team_members() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;

-- ─── task_comments ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task participants read comments" ON task_comments;
CREATE POLICY "Task participants read comments"
  ON task_comments FOR SELECT TO authenticated
  USING (can_access_task(task_id));

DROP POLICY IF EXISTS "Task participants write comments" ON task_comments;
CREATE POLICY "Task participants write comments"
  ON task_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND can_access_task(task_id));

DROP POLICY IF EXISTS "Author or owner deletes comments" ON task_comments;
CREATE POLICY "Author or owner deletes comments"
  ON task_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR is_app_owner());

-- ─── Notifications: task reassignment ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_task_reassignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     AND NEW.assigned_to <> auth.uid() THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
    VALUES (NEW.assigned_to, 'task', 'Task assigned to you',
            'Task: ' || NEW.title || COALESCE(' (due ' || NEW.due_date::text || ')', ''),
            jsonb_build_object('title', NEW.title), NEW.id, false);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_task_reassignment ON public.tasks;
CREATE TRIGGER trg_notify_task_reassignment
  AFTER UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_reassignment();

-- ─── Notifications: new comment ──────────────────────────────────────────────
-- Fan out to the task's participants (assignee, property staff, owners),
-- excluding the comment author.

CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS TRIGGER AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT id, title, property_id, assigned_to INTO t
  FROM public.tasks WHERE id = NEW.task_id;

  INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
  SELECT DISTINCT r.uid, 'task', 'New comment on task',
         t.title || ': ' || left(NEW.body, 120),
         jsonb_build_object('title', t.title), t.id, false
  FROM (
    SELECT t.assigned_to AS uid
    UNION
    SELECT ra.user_id
      FROM public.role_assignments ra
      WHERE t.property_id IS NOT NULL AND ra.property_id = t.property_id
    UNION
    SELECT p.id
      FROM public.profiles p
      WHERE p.role = 'owner'
  ) r
  WHERE r.uid IS NOT NULL AND r.uid <> NEW.author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_task_comment ON public.task_comments;
CREATE TRIGGER trg_notify_task_comment
  AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_comment();
