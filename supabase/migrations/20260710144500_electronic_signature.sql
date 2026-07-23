CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.contract_files
  ADD COLUMN IF NOT EXISTS content_sha256 text,
  ADD COLUMN IF NOT EXISTS file_role text NOT NULL DEFAULT 'source';

ALTER TABLE public.contract_files
  DROP CONSTRAINT IF EXISTS contract_files_file_role_check,
  ADD CONSTRAINT contract_files_file_role_check
    CHECK (file_role IN ('source', 'signing_snapshot', 'signed_final', 'audit_certificate'));

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signing_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS locked_pdf_sha256 text,
  ADD COLUMN IF NOT EXISTS signing_expires_at timestamptz;

ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_signing_status_check,
  ADD CONSTRAINT contracts_signing_status_check
    CHECK (signing_status IN (
      'not_started', 'draft', 'sent', 'partially_signed',
      'finalizing', 'completed', 'expired', 'voided', 'declined'
    ));

CREATE TABLE IF NOT EXISTS public.signature_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  source_file_id uuid REFERENCES public.contract_files(id),
  source_storage_path text NOT NULL,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  final_file_id uuid REFERENCES public.contract_files(id),
  title text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sent', 'partially_signed', 'finalizing',
      'completed', 'expired', 'voided', 'declined'
    )),
  signing_order text NOT NULL DEFAULT 'sequential'
    CHECK (signing_order IN ('sequential', 'parallel')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  sent_at timestamptz,
  completed_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signature_envelopes_contract_idx
  ON public.signature_envelopes (contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS signature_envelopes_property_idx
  ON public.signature_envelopes (property_id, status);

CREATE TABLE IF NOT EXISTS public.signature_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id uuid NOT NULL REFERENCES public.signature_envelopes(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  email text NOT NULL CHECK (position('@' IN email) > 1),
  role text NOT NULL DEFAULT 'guest'
    CHECK (role IN ('owner', 'guest', 'concierge', 'agency', 'witness', 'other')),
  signing_order integer NOT NULL DEFAULT 1 CHECK (signing_order >= 1),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'invited', 'otp_verified', 'signed',
      'declined', 'expired', 'cancelled'
    )),
  access_token_hash text NOT NULL UNIQUE CHECK (access_token_hash ~ '^[a-f0-9]{64}$'),
  token_expires_at timestamptz NOT NULL,
  last_invited_at timestamptz,
  otp_verified_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (envelope_id, email)
);

CREATE INDEX IF NOT EXISTS signature_recipients_envelope_idx
  ON public.signature_recipients (envelope_id, signing_order);

CREATE TABLE IF NOT EXISTS public.signature_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id uuid NOT NULL REFERENCES public.signature_envelopes(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.signature_recipients(id) ON DELETE CASCADE,
  field_type text NOT NULL
    CHECK (field_type IN ('signature', 'initials', 'name', 'date', 'checkbox', 'text')),
  page_number integer NOT NULL CHECK (page_number >= 1),
  x numeric(7,6) NOT NULL CHECK (x BETWEEN 0 AND 1),
  y numeric(7,6) NOT NULL CHECK (y BETWEEN 0 AND 1),
  width numeric(7,6) NOT NULL CHECK (width > 0 AND width <= 1),
  height numeric(7,6) NOT NULL CHECK (height > 0 AND height <= 1),
  required boolean NOT NULL DEFAULT true,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signature_fields_recipient_idx
  ON public.signature_fields (recipient_id, page_number);

CREATE TABLE IF NOT EXISTS public.signature_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id uuid NOT NULL UNIQUE REFERENCES public.signature_fields(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.signature_recipients(id) ON DELETE CASCADE,
  value_text text,
  value_data text,
  value_sha256 text CHECK (value_sha256 IS NULL OR value_sha256 ~ '^[a-f0-9]{64}$'),
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.signature_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.signature_recipients(id) ON DELETE CASCADE,
  otp_hash text NOT NULL CHECK (otp_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signature_otp_recipient_idx
  ON public.signature_otp_challenges (recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.signature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id uuid NOT NULL REFERENCES public.signature_envelopes(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.signature_recipients(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'envelope_created', 'invitation_sent', 'invitation_failed',
    'document_viewed', 'otp_sent', 'otp_failed', 'otp_verified',
    'consent_accepted', 'recipient_signed', 'recipient_declined',
    'envelope_partially_signed', 'envelope_completed',
    'envelope_voided', 'envelope_expired', 'hash_mismatch',
    'finalization_failed'
  )),
  actor_user_id uuid REFERENCES auth.users(id),
  actor_email text,
  ip_address inet,
  user_agent text,
  document_sha256 text CHECK (document_sha256 IS NULL OR document_sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signature_events_envelope_idx
  ON public.signature_events (envelope_id, created_at);

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS active_signature_envelope_id uuid
    REFERENCES public.signature_envelopes(id) ON DELETE SET NULL;

ALTER TABLE public.signature_envelopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Property members read signature envelopes" ON public.signature_envelopes;
CREATE POLICY "Property members read signature envelopes"
ON public.signature_envelopes FOR SELECT TO authenticated
USING (public.can_access_property(property_id));

DROP POLICY IF EXISTS "Property members read signature recipients" ON public.signature_recipients;
CREATE POLICY "Property members read signature recipients"
ON public.signature_recipients FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.signature_envelopes envelope
    WHERE envelope.id = signature_recipients.envelope_id
      AND public.can_access_property(envelope.property_id)
  )
);

DROP POLICY IF EXISTS "Property members read signature fields" ON public.signature_fields;
CREATE POLICY "Property members read signature fields"
ON public.signature_fields FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.signature_envelopes envelope
    WHERE envelope.id = signature_fields.envelope_id
      AND public.can_access_property(envelope.property_id)
  )
);

DROP POLICY IF EXISTS "Property members read signature values" ON public.signature_field_values;
CREATE POLICY "Property members read signature values"
ON public.signature_field_values FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.signature_recipients recipient
    JOIN public.signature_envelopes envelope ON envelope.id = recipient.envelope_id
    WHERE recipient.id = signature_field_values.recipient_id
      AND public.can_access_property(envelope.property_id)
  )
);

DROP POLICY IF EXISTS "Property members read signature events" ON public.signature_events;
CREATE POLICY "Property members read signature events"
ON public.signature_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.signature_envelopes envelope
    WHERE envelope.id = signature_events.envelope_id
      AND public.can_access_property(envelope.property_id)
  )
);

-- OTP rows deliberately have no client policy. They are Edge Function only.

CREATE OR REPLACE FUNCTION public.prevent_signature_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Signature audit events are immutable';
END;
$$;

DROP TRIGGER IF EXISTS prevent_signature_event_mutation_trigger
  ON public.signature_events;
CREATE TRIGGER prevent_signature_event_mutation_trigger
BEFORE UPDATE OR DELETE ON public.signature_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_signature_event_mutation();

CREATE OR REPLACE FUNCTION public.sync_signature_envelope_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.contracts
  SET
    active_signature_envelope_id = NEW.id,
    signing_status = NEW.status,
    locked_pdf_sha256 = NEW.source_sha256,
    signing_expires_at = NEW.expires_at,
    status = CASE
      WHEN NEW.status = 'completed' THEN 'signed'
      WHEN NEW.status = 'expired' THEN 'expired'
      WHEN NEW.status IN ('sent', 'partially_signed', 'finalizing') THEN 'sent'
      ELSE status
    END
  WHERE id = NEW.contract_id;

  UPDATE public.reservations
  SET contract_status = CASE
    WHEN NEW.status = 'completed' THEN 'signed'
    WHEN NEW.status IN ('sent', 'partially_signed', 'finalizing') THEN 'sent'
    ELSE contract_status
  END
  WHERE id = NEW.reservation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_signature_envelope_status_trigger
  ON public.signature_envelopes;
CREATE TRIGGER sync_signature_envelope_status_trigger
AFTER INSERT OR UPDATE OF status ON public.signature_envelopes
FOR EACH ROW EXECUTE FUNCTION public.sync_signature_envelope_status();

-- Lock down primitive signing tables that may exist on older remote schemas.
DO $$
BEGIN
  IF to_regclass('public.contract_signatures') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated manage contract_signatures" ON public.contract_signatures';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated read contract_signatures" ON public.contract_signatures';
    EXECUTE 'CREATE POLICY "Property members read legacy signatures"
      ON public.contract_signatures FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.contracts contract
          JOIN public.reservations reservation ON reservation.id = contract.reservation_id
          WHERE contract.id = contract_signatures.contract_id
            AND public.can_access_property(reservation.property_id)
        )
      )';
  END IF;

  IF to_regclass('public.contract_templates') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated manage contract_templates" ON public.contract_templates';
    EXECUTE 'CREATE POLICY "Owners manage own contract templates"
      ON public.contract_templates FOR ALL TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()))';
  END IF;
END;
$$;
