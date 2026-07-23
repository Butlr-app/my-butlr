-- Harden partner portal RLS: invoice insert, task/partner updates, calendar read, sync trigger

-- ---------------------------------------------------------------------------
-- 1) Invoice INSERT — fully qualify NEW-row columns inside subqueries
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Provider invoices insert by partner" ON public.provider_invoices;
CREATE POLICY "Provider invoices insert by partner"
ON public.provider_invoices
FOR INSERT
TO authenticated
WITH CHECK (
  provider_invoices.partner_id = public.my_marketplace_partner_id()
  AND provider_invoices.status = 'received'
  AND provider_invoices.task_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.properties prop
    WHERE prop.id = provider_invoices.property_id
      AND prop.owner_id = provider_invoices.owner_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = provider_invoices.task_id
      AND t.partner_id = provider_invoices.partner_id
      AND t.property_id = provider_invoices.property_id
      AND t.status = 'done'
  )
);

-- ---------------------------------------------------------------------------
-- 2) Assigned partners may only change task.status (+ updated_at)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restrict_partner_task_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_partner uuid := public.my_marketplace_partner_id();
BEGIN
  IF my_partner IS NULL OR OLD.partner_id IS DISTINCT FROM my_partner THEN
    RETURN NEW;
  END IF;

  -- Owners / staff with property access keep full update rights
  IF OLD.owner_id = auth.uid()
     OR (OLD.property_id IS NOT NULL AND public.can_access_property(OLD.property_id)) THEN
    RETURN NEW;
  END IF;

  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.reservation_id IS DISTINCT FROM OLD.reservation_id
     OR NEW.link_type IS DISTINCT FROM OLD.link_type
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.template_id IS DISTINCT FROM OLD.template_id
     OR NEW.maintenance_plan_id IS DISTINCT FROM OLD.maintenance_plan_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Partners can only update the status of assigned tasks';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_partner_task_updates ON public.tasks;
CREATE TRIGGER trg_restrict_partner_task_updates
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_partner_task_updates();

-- ---------------------------------------------------------------------------
-- 3) Marketplace self-update — lock economic / identity columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restrict_marketplace_partner_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.source = 'marketplace'
     AND OLD.profile_id IS NOT NULL
     AND OLD.profile_id = auth.uid() THEN
    NEW.id := OLD.id;
    NEW.source := OLD.source;
    NEW.profile_id := OLD.profile_id;
    NEW.owner_id := OLD.owner_id;
    NEW.user_id := OLD.user_id;
    NEW.commission := OLD.commission;
    NEW.rating := OLD.rating;
    NEW.bookings_count := OLD.bookings_count;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restrict_marketplace_partner_self_update ON public.partners;
CREATE TRIGGER trg_restrict_marketplace_partner_self_update
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_marketplace_partner_self_update();

-- ---------------------------------------------------------------------------
-- 4) Calendar read — only related owners / property staff (not all auth users)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Partner calendar read by owners" ON public.partner_calendar_days;
CREATE POLICY "Partner calendar read by owners"
ON public.partner_calendar_days
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.partners p
    WHERE p.id = partner_calendar_days.partner_id
      AND p.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.partner_id = partner_calendar_days.partner_id
      AND t.property_id IS NOT NULL
      AND public.can_access_property(t.property_id)
  )
);

-- ---------------------------------------------------------------------------
-- 5) Sync trigger — do not clobber marketplace onboarding fields with nulls
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_marketplace_partner_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'partner' THEN
    IF EXISTS (
      SELECT 1
      FROM public.partners existing
      WHERE existing.profile_id = NEW.id
        AND existing.source = 'marketplace'
    ) THEN
      UPDATE public.partners
      SET
        email = COALESCE(NEW.email, partners.email),
        phone = COALESCE(NULLIF(trim(NEW.phone), ''), partners.phone),
        name = CASE
          WHEN partners.onboarding_completed THEN partners.name
          ELSE COALESCE(
            NULLIF(trim(NEW.full_name), ''),
            partners.name,
            NEW.email,
            'Partenaire'
          )
        END,
        contact = CASE
          WHEN partners.onboarding_completed THEN partners.contact
          ELSE COALESCE(NULLIF(trim(NEW.full_name), ''), partners.contact)
        END,
        updated_at = now()
      WHERE profile_id = NEW.id
        AND source = 'marketplace';
    ELSE
      INSERT INTO public.partners (
        name,
        email,
        phone,
        contact,
        source,
        profile_id,
        status,
        commission,
        updated_at
      )
      VALUES (
        COALESCE(NULLIF(trim(NEW.full_name), ''), NEW.email, 'Partenaire'),
        NEW.email,
        NEW.phone,
        NEW.full_name,
        'marketplace',
        NEW.id,
        'active',
        10,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
