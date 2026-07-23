-- Owners can only access their own properties; operational roles need an assignment.
CREATE OR REPLACE FUNCTION public.can_access_property(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.properties property
      WHERE property.id = p_id
        AND property.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.role_assignments assignment
      WHERE assignment.user_id = auth.uid()
        AND assignment.property_id = p_id
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_property(uuid) TO authenticated;
