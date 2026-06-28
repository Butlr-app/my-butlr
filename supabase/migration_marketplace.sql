-- Service Marketplace: fulfillment workflow
-- Routes guest service requests to partners, lets staff quote/manage the lifecycle,
-- and notifies staff (on new request) + the guest (on status change).

-- ─── Extend service_requests ──────────────────────────────────────────────────
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id);
ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS quoted_price DECIMAL(10,2);

-- Enable Realtime so staff see incoming requests live.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'service_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
  END IF;
END $$;

-- ─── Allow the 'service_request' notification type ────────────────────────────
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reservation', 'task', 'payment', 'system', 'service_request'));
