-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 8.1 — Web Push notifications (PWA) for the House Manager mobile app
-- ═══════════════════════════════════════════════════════════════════════════════
-- Stores per-device push subscriptions and, whenever a notification row is
-- inserted for a specific user, fires a SECURITY DEFINER trigger that calls the
-- `send-push` Edge Function (via pg_net) which performs the VAPID-signed Web Push
-- delivery. Broadcast rows (user_id IS NULL) are ignored — only targeted
-- notifications generate a push.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ─── Subscriptions (one row per browser/device) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─── Private config consumed only by the SECURITY DEFINER dispatch trigger ───────
CREATE TABLE IF NOT EXISTS push_config (
  id             BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),   -- single-row table
  function_url   TEXT NOT NULL,
  webhook_secret TEXT NOT NULL
);
ALTER TABLE push_config ENABLE ROW LEVEL SECURITY;  -- no policies → clients cannot read

-- ─── Dispatch trigger: call the Edge Function on each targeted notification ──────
CREATE OR REPLACE FUNCTION public.fn_dispatch_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg push_config%ROWTYPE;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NULL;  -- skip broadcasts
  END IF;

  SELECT * INTO v_cfg FROM push_config LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;  -- push not configured yet
  END IF;

  PERFORM net.http_post(
    url     := v_cfg.function_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', v_cfg.webhook_secret
               ),
    body    := jsonb_build_object(
                 'user_id', NEW.user_id,
                 'title',   COALESCE(NEW.title, 'My Butlr'),
                 'body',    COALESCE(NEW.message, ''),
                 'tag',     NEW.type,
                 'url',     '/app/notifications'
               )
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_push ON notifications;
CREATE TRIGGER trg_dispatch_push
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.fn_dispatch_push();
