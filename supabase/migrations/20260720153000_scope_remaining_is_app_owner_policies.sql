-- Scope remaining global is_app_owner() policies + payouts + images writes.
-- is_app_owner() = any profiles.role = 'owner' (cross-tenant). Replace with property scope.

CREATE OR REPLACE FUNCTION public.is_property_owner(p_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.properties property
    WHERE property.id = p_id
      AND property.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_reservation(r_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reservations reservation
    WHERE reservation.id = r_id
      AND public.can_access_property(reservation.property_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Payouts: property-scoped via reservation / payment
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Payouts owner only" ON public.payouts;
CREATE POLICY "Payouts by reservation property access"
ON public.payouts
FOR ALL
TO authenticated
USING (
  (
    payouts.reservation_id IS NOT NULL
    AND public.can_access_reservation(payouts.reservation_id)
  )
  OR (
    payouts.payment_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.payments payment
      WHERE payment.id = payouts.payment_id
        AND payment.reservation_id IS NOT NULL
        AND public.can_access_reservation(payment.reservation_id)
    )
  )
)
WITH CHECK (
  (
    payouts.reservation_id IS NOT NULL
    AND public.can_access_reservation(payouts.reservation_id)
  )
  OR (
    payouts.payment_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.payments payment
      WHERE payment.id = payouts.payment_id
        AND payment.reservation_id IS NOT NULL
        AND public.can_access_reservation(payment.reservation_id)
    )
  )
);

-- ---------------------------------------------------------------------------
-- role_assignments SELECT
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read own assignments or owner reads all" ON public.role_assignments;
CREATE POLICY "Read own or property-owner assignments"
ON public.role_assignments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_property_owner(property_id)
);

-- ---------------------------------------------------------------------------
-- Tables with property_id: strip global owner
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners manage budgets" ON public.budgets;
CREATE POLICY "Owners manage budgets"
ON public.budgets
FOR ALL
TO authenticated
USING (public.is_property_owner(property_id))
WITH CHECK (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Staff read budgets" ON public.budgets;
CREATE POLICY "Staff read budgets"
ON public.budgets
FOR SELECT
TO authenticated
USING (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Owners manage maintenance plans" ON public.maintenance_plans;
CREATE POLICY "Owners manage maintenance plans"
ON public.maintenance_plans
FOR ALL
TO authenticated
USING (public.is_property_owner(property_id))
WITH CHECK (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Staff read maintenance plans" ON public.maintenance_plans;
CREATE POLICY "Staff read maintenance plans"
ON public.maintenance_plans
FOR SELECT
TO authenticated
USING (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Owners delete expenses" ON public.expenses;
CREATE POLICY "Owners delete expenses"
ON public.expenses
FOR DELETE
TO authenticated
USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners delete incidents" ON public.incidents;
CREATE POLICY "Owners delete incidents"
ON public.incidents
FOR DELETE
TO authenticated
USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners delete inspections" ON public.inspections;
CREATE POLICY "Owners delete inspections"
ON public.inspections
FOR DELETE
TO authenticated
USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners delete inventory items" ON public.inventory_items;
CREATE POLICY "Owners delete inventory items"
ON public.inventory_items
FOR DELETE
TO authenticated
USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners delete work orders" ON public.work_orders;
CREATE POLICY "Owners delete work orders"
ON public.work_orders
FOR DELETE
TO authenticated
USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners delete shifts" ON public.shifts;
CREATE POLICY "Owners delete shifts"
ON public.shifts
FOR DELETE
TO authenticated
USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners update shifts" ON public.shifts;
CREATE POLICY "Owners update shifts"
ON public.shifts
FOR UPDATE
TO authenticated
USING (public.is_property_owner(property_id))
WITH CHECK (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners create shifts" ON public.shifts;
CREATE POLICY "Owners create shifts"
ON public.shifts
FOR INSERT
TO authenticated
WITH CHECK (public.is_property_owner(property_id));

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners delete documents" ON public.documents;
CREATE POLICY "Owners delete documents"
ON public.documents
FOR DELETE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
);

DROP POLICY IF EXISTS "Owners update documents" ON public.documents;
CREATE POLICY "Owners update documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
)
WITH CHECK (
  uploaded_by = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
);

DROP POLICY IF EXISTS "Staff read documents" ON public.documents;
CREATE POLICY "Staff read documents"
ON public.documents
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR (property_id IS NOT NULL AND public.can_access_property(property_id))
);

DROP POLICY IF EXISTS "Staff upload documents" ON public.documents;
CREATE POLICY "Staff upload documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  property_id IS NOT NULL
  AND public.can_access_property(property_id)
);

-- ---------------------------------------------------------------------------
-- Time entries
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read time entries" ON public.time_entries;
CREATE POLICY "Read time entries"
ON public.time_entries
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (property_id IS NOT NULL AND public.can_access_property(property_id))
);

DROP POLICY IF EXISTS "Update time entries" ON public.time_entries;
CREATE POLICY "Update time entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
)
WITH CHECK (
  user_id = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
);

DROP POLICY IF EXISTS "Delete time entries" ON public.time_entries;
CREATE POLICY "Delete time entries"
ON public.time_entries
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
);

DROP POLICY IF EXISTS "Clock in time entries" ON public.time_entries;
CREATE POLICY "Clock in time entries"
ON public.time_entries
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (property_id IS NULL OR public.can_access_property(property_id))
);

-- ---------------------------------------------------------------------------
-- Activity log / task comments / provider ratings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read activity for accessible villas" ON public.activity_log;
CREATE POLICY "Read activity for accessible villas"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  property_id IS NOT NULL
  AND public.can_access_property(property_id)
);

DROP POLICY IF EXISTS "Author or owner deletes comments" ON public.task_comments;
CREATE POLICY "Author or property-owner deletes comments"
ON public.task_comments
FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.tasks task
    WHERE task.id = task_comments.task_id
      AND task.property_id IS NOT NULL
      AND public.is_property_owner(task.property_id)
  )
);

DROP POLICY IF EXISTS "Read provider ratings" ON public.provider_ratings;
CREATE POLICY "Read provider ratings"
ON public.provider_ratings
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR (property_id IS NOT NULL AND public.can_access_property(property_id))
);

DROP POLICY IF EXISTS "Update provider ratings" ON public.provider_ratings;
CREATE POLICY "Update provider ratings"
ON public.provider_ratings
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
)
WITH CHECK (
  created_by = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
);

DROP POLICY IF EXISTS "Delete provider ratings" ON public.provider_ratings;
CREATE POLICY "Delete provider ratings"
ON public.provider_ratings
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR (property_id IS NOT NULL AND public.is_property_owner(property_id))
);

-- ---------------------------------------------------------------------------
-- Invoices: creator only (drop global owner bypass)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Creator or owner manages invoices" ON public.invoices;
CREATE POLICY "Creator manages invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Creator or owner reads invoices" ON public.invoices;
CREATE POLICY "Creator reads invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Inspections children: require property access via parent
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Property staff read inspections" ON public.inspections;
CREATE POLICY "Property staff read inspections"
ON public.inspections
FOR SELECT
TO authenticated
USING (
  property_id IS NOT NULL
  AND public.can_access_property(property_id)
);

DROP POLICY IF EXISTS "Property staff update inspections" ON public.inspections;
CREATE POLICY "Property staff update inspections"
ON public.inspections
FOR UPDATE
TO authenticated
USING (
  property_id IS NOT NULL
  AND public.can_access_property(property_id)
)
WITH CHECK (
  property_id IS NOT NULL
  AND public.can_access_property(property_id)
);

DROP POLICY IF EXISTS "Property staff manage inspection reports" ON public.inspection_reports;
CREATE POLICY "Property staff manage inspection reports"
ON public.inspection_reports
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inspections inspection
    WHERE inspection.id = inspection_reports.inspection_id
      AND inspection.property_id IS NOT NULL
      AND public.can_access_property(inspection.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inspections inspection
    WHERE inspection.id = inspection_reports.inspection_id
      AND inspection.property_id IS NOT NULL
      AND public.can_access_property(inspection.property_id)
  )
);

DROP POLICY IF EXISTS "Property staff manage inspection rooms" ON public.inspection_rooms;
CREATE POLICY "Property staff manage inspection rooms"
ON public.inspection_rooms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inspections inspection
    WHERE inspection.id = inspection_rooms.inspection_id
      AND inspection.property_id IS NOT NULL
      AND public.can_access_property(inspection.property_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inspections inspection
    WHERE inspection.id = inspection_rooms.inspection_id
      AND inspection.property_id IS NOT NULL
      AND public.can_access_property(inspection.property_id)
  )
);

-- ---------------------------------------------------------------------------
-- Global templates: only users who own at least one property
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners manage checklist templates" ON public.checklist_templates;
CREATE POLICY "Owners manage checklist templates"
ON public.checklist_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners manage task templates" ON public.task_templates;
CREATE POLICY "Owners manage task templates"
ON public.task_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties property
    WHERE property.owner_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Storage images: keep public read (bucket public) but scope writes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

CREATE POLICY "Images upload by property or own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (
    (
      (storage.foldername(name))[1] = 'properties'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (
      (storage.foldername(name))[1] = 'inspections'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Images update by property or own folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images'
  AND (
    (
      (storage.foldername(name))[1] = 'properties'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (
      (storage.foldername(name))[1] = 'inspections'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'images'
  AND (
    (
      (storage.foldername(name))[1] = 'properties'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (
      (storage.foldername(name))[1] = 'inspections'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Images delete by property or own folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (
    (
      (storage.foldername(name))[1] = 'properties'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (
      (storage.foldername(name))[1] = 'inspections'
      AND public.can_access_property(((storage.foldername(name))[2])::uuid)
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- ---------------------------------------------------------------------------
-- Agency: block calendar/property mutations (SELECT kept for availability UI;
-- PII column projection is a follow-up via availability view).
-- Split FOR ALL if present so DELETE stays owner-scoped.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Reservation access by property" ON public.reservations;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reservations'
      AND policyname = 'Staff or guest read reservations'
  ) THEN
    CREATE POLICY "Staff or guest read reservations"
    ON public.reservations FOR SELECT TO authenticated
    USING (public.can_access_property(property_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reservations'
      AND policyname = 'Staff insert reservations'
  ) THEN
    CREATE POLICY "Staff insert reservations"
    ON public.reservations FOR INSERT TO authenticated
    WITH CHECK (public.can_access_property(property_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reservations'
      AND policyname = 'Staff update reservations'
  ) THEN
    CREATE POLICY "Staff update reservations"
    ON public.reservations FOR UPDATE TO authenticated
    USING (public.can_access_property(property_id))
    WITH CHECK (public.can_access_property(property_id));
  END IF;
END $$;

-- Agency cannot mutate calendar events
CREATE OR REPLACE FUNCTION public.enforce_agency_calendar_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT profile.role INTO actor_role
  FROM public.profiles profile
  WHERE profile.id = auth.uid();

  IF actor_role = 'agency' THEN
    RAISE EXCEPTION 'Une agence ne peut pas modifier le calendrier'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_agency_calendar_limits_trigger ON public.calendar_events;
CREATE TRIGGER enforce_agency_calendar_limits_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agency_calendar_limits();

-- Agency cannot update properties
CREATE OR REPLACE FUNCTION public.enforce_agency_property_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT profile.role INTO actor_role
  FROM public.profiles profile
  WHERE profile.id = auth.uid();

  IF actor_role = 'agency' AND TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Une agence ne peut pas modifier une propriété'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_agency_property_limits_trigger ON public.properties;
CREATE TRIGGER enforce_agency_property_limits_trigger
  BEFORE UPDATE OR DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agency_property_limits();
