-- Tasks linked to a client stay, a villa, or a service provider.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'property',
  ADD COLUMN IF NOT EXISTS reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

UPDATE public.tasks
SET
  link_type = 'property',
  reservation_id = NULL,
  partner_id = NULL
WHERE property_id IS NOT NULL;

DELETE FROM public.tasks
WHERE property_id IS NULL
  AND reservation_id IS NULL
  AND partner_id IS NULL;

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_link_type_check,
  ADD CONSTRAINT tasks_link_type_check
    CHECK (link_type IN ('client', 'property', 'partner'));

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_link_consistency_check,
  ADD CONSTRAINT tasks_link_consistency_check CHECK (
    (
      link_type = 'property'
      AND property_id IS NOT NULL
      AND reservation_id IS NULL
      AND partner_id IS NULL
    )
    OR (
      link_type = 'client'
      AND reservation_id IS NOT NULL
      AND partner_id IS NULL
    )
    OR (
      link_type = 'partner'
      AND partner_id IS NOT NULL
      AND reservation_id IS NULL
      AND property_id IS NULL
    )
  );

CREATE INDEX IF NOT EXISTS tasks_reservation_id_idx ON public.tasks (reservation_id);
CREATE INDEX IF NOT EXISTS tasks_partner_id_idx ON public.tasks (partner_id);
CREATE INDEX IF NOT EXISTS tasks_link_type_idx ON public.tasks (link_type);

DROP POLICY IF EXISTS "Authenticated read tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated manage tasks" ON public.tasks;

CREATE POLICY "Tasks by accessible context"
ON public.tasks
FOR ALL
TO authenticated
USING (
  (
    property_id IS NOT NULL
    AND public.can_access_property(property_id)
  )
  OR (
    reservation_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.reservations reservation
      WHERE reservation.id = tasks.reservation_id
        AND public.can_access_property(reservation.property_id)
    )
  )
  OR (
    link_type = 'partner'
    AND partner_id IS NOT NULL
  )
)
WITH CHECK (
  (
    link_type = 'property'
    AND property_id IS NOT NULL
    AND public.can_access_property(property_id)
    AND reservation_id IS NULL
    AND partner_id IS NULL
  )
  OR (
    link_type = 'client'
    AND reservation_id IS NOT NULL
    AND partner_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.reservations reservation
      WHERE reservation.id = reservation_id
        AND public.can_access_property(reservation.property_id)
    )
  )
  OR (
    link_type = 'partner'
    AND partner_id IS NOT NULL
    AND reservation_id IS NULL
    AND property_id IS NULL
  )
);
