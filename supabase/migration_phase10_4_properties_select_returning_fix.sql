-- Phase 10.4 — Fix property creation failing with a false RLS violation.
--
-- Symptom: creating a property from the UI returned
--   "new row violates row-level security policy for table \"properties\""
-- even though the INSERT WITH CHECK passed and the owner_id was correct.
--
-- Cause: the SELECT policy is `can_access_property(id)`, a SECURITY DEFINER
-- function that re-queries public.properties for the row. During an
-- `INSERT ... RETURNING` (which supabase-js `.insert().select()` emits), the
-- just-inserted row is not visible to that function's snapshot, so it returns
-- false and PostgREST rejects the returned row as an RLS violation.
--
-- Fix: let the SELECT policy also match the row's own owner_id column directly.
-- This value is present on the returned tuple, so RETURNING works, and it is
-- semantically identical for committed reads (an owner could already read their
-- own rows via can_access_property; a non-owner without an assignment still
-- cannot read).

DROP POLICY IF EXISTS "Owner or assigned staff read properties" ON public.properties;

CREATE POLICY "Owner or assigned staff read properties"
  ON public.properties FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.can_access_property(id));
