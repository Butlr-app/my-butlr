-- Phase 10.2 — Incident auto-escalation
-- Unresolved high/critical incidents are escalated after an urgency-based
-- delay: a fresh notification is fanned out to the villa's staff + owners and
-- the incident is stamped with escalated_at so it fires only once.
--   critical → 2h, high → 8h.

ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.escalate_incidents()
RETURNS INTEGER AS $$
DECLARE
  rec RECORD;
  escalated_count INTEGER := 0;
  hrs INTEGER;
BEGIN
  FOR rec IN
    SELECT id, property_id, title, urgency, created_at
    FROM public.incidents
    WHERE status IN ('open','in_progress')
      AND escalated_at IS NULL
      AND (
        (urgency = 'critical' AND created_at < now() - INTERVAL '2 hours')
        OR (urgency = 'high' AND created_at < now() - INTERVAL '8 hours')
      )
  LOOP
    UPDATE public.incidents SET escalated_at = now() WHERE id = rec.id;

    hrs := CEIL(EXTRACT(EPOCH FROM (now() - rec.created_at)) / 3600.0);

    INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
    SELECT DISTINCT r.uid, 'incident', 'Incident escalated',
           'Unresolved ' || rec.urgency || ' incident: ' || rec.title || ' (open ' || hrs || 'h)',
           jsonb_build_object('title', rec.title, 'urgency', rec.urgency, 'escalated', true),
           rec.id, false
    FROM (
      SELECT ra.user_id AS uid
        FROM public.role_assignments ra
        WHERE ra.property_id = rec.property_id
      UNION
      SELECT p.id
        FROM public.profiles p
        WHERE p.role = 'owner'
    ) r
    WHERE r.uid IS NOT NULL;

    escalated_count := escalated_count + 1;
  END LOOP;

  RETURN escalated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.escalate_incidents() FROM anon;
GRANT EXECUTE ON FUNCTION public.escalate_incidents() TO authenticated;

-- Best effort: run server-side every 15 min when pg_cron is available.
-- The app also calls escalate_incidents() on Incidents page load as a fallback.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('escalate-incidents', '*/15 * * * *', 'SELECT public.escalate_incidents()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable, incidents escalated on app load only';
END;
$$;
