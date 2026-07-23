-- Owner-configurable house manager visibility (JSON capability map).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS house_manager_permissions jsonb;

COMMENT ON COLUMN public.profiles.house_manager_permissions IS
  'Owner template for house_manager role capabilities. NULL = app defaults (owner-like minus reservation amounts, contracts; never delete properties).';
