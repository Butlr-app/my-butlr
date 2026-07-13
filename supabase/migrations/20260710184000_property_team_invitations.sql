-- Pending property team invitations (before the user has an account).

CREATE TABLE IF NOT EXISTS public.property_team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('house_manager', 'concierge', 'maintenance', 'partner')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  message text,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS property_team_invitations_pending_email_idx
  ON public.property_team_invitations (property_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS property_team_invitations_property_id_idx
  ON public.property_team_invitations (property_id);

ALTER TABLE public.property_team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Property owners manage team invitations"
  ON public.property_team_invitations;

CREATE POLICY "Property owners manage team invitations"
ON public.property_team_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.id = property_id
      AND property.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.id = property_id
      AND property.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Property team read invitations"
  ON public.property_team_invitations;

CREATE POLICY "Property team read invitations"
ON public.property_team_invitations
FOR SELECT
TO authenticated
USING (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Owner manages role_assignments" ON public.role_assignments;

CREATE POLICY "Owner manages role_assignments"
ON public.role_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.id = property_id
      AND property.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.id = property_id
      AND property.owner_id = auth.uid()
  )
);
