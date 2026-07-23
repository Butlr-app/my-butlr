-- Extend property team roles on role_assignments.

ALTER TABLE public.role_assignments DROP CONSTRAINT IF EXISTS role_assignments_role_check;

ALTER TABLE public.role_assignments
  ADD CONSTRAINT role_assignments_role_check
  CHECK (role IN ('house_manager', 'concierge', 'maintenance', 'partner'));
