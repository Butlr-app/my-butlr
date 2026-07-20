-- Agency immo: assignable on property team; client stay requests (pending reservations).

-- 1) Allow agency on property team assignments & invitations
ALTER TABLE public.role_assignments DROP CONSTRAINT IF EXISTS role_assignments_role_check;
ALTER TABLE public.role_assignments
  ADD CONSTRAINT role_assignments_role_check
  CHECK (role IN ('house_manager', 'concierge', 'maintenance', 'partner', 'agency'));

ALTER TABLE public.property_team_invitations DROP CONSTRAINT IF EXISTS property_team_invitations_role_check;
ALTER TABLE public.property_team_invitations
  ADD CONSTRAINT property_team_invitations_role_check
  CHECK (role IN ('house_manager', 'concierge', 'maintenance', 'partner', 'agency'));

-- 2) Track who requested a stay (agency client request)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reservations_requested_by_idx
  ON public.reservations (requested_by)
  WHERE requested_by IS NOT NULL;

-- 3) Enforce agency limits on insert/update (profile.role = agency)
CREATE OR REPLACE FUNCTION public.enforce_agency_reservation_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role text;
BEGIN
  SELECT profile.role
  INTO actor_role
  FROM public.profiles profile
  WHERE profile.id = auth.uid();

  IF actor_role IS DISTINCT FROM 'agency' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'Les demandes agence doivent être en statut pending'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.booking_kind IS DISTINCT FROM 'guest' THEN
      RAISE EXCEPTION 'Les demandes agence doivent concerner un séjour client'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.contract_mode = 'none' THEN
      RAISE EXCEPTION 'Les demandes agence ne peuvent pas bloquer le calendrier'
        USING ERRCODE = '42501';
    END IF;

    NEW.requested_by := auth.uid();
    NEW.status := 'pending';
    NEW.booking_kind := 'guest';
    NEW.total_amount := COALESCE(NEW.total_amount, 0);
    IF NEW.total_amount < 0 THEN
      NEW.total_amount := 0;
    END IF;
    NEW.payment_status := 'pending';
    IF NEW.contract_mode IS NULL OR NEW.contract_mode = 'none' THEN
      NEW.contract_mode := 'to_prepare';
    END IF;
    IF NEW.contract_status IS NULL OR NEW.contract_status = 'none' THEN
      NEW.contract_status := 'draft';
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: agency may only edit/cancel its own pending requests
  IF OLD.requested_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Une agence ne peut modifier que ses propres demandes'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Une agence ne peut modifier qu’une demande en attente'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status NOT IN ('pending', 'cancelled') THEN
    RAISE EXCEPTION 'Une agence ne peut pas confirmer une réservation'
      USING ERRCODE = '42501';
  END IF;

  NEW.requested_by := OLD.requested_by;
  NEW.property_id := OLD.property_id;
  NEW.total_amount := OLD.total_amount;
  NEW.payment_status := OLD.payment_status;
  NEW.contract_status := OLD.contract_status;
  NEW.contract_mode := OLD.contract_mode;
  NEW.booking_kind := OLD.booking_kind;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_agency_reservation_limits_trigger ON public.reservations;
CREATE TRIGGER enforce_agency_reservation_limits_trigger
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_agency_reservation_limits();
