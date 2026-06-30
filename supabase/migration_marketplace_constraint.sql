-- Service Marketplace migration follow-up
-- The schema consolidation widened notifications.type, but existing deployments
-- still need the CHECK constraint refreshed to accept service_request events.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('reservation', 'task', 'payment', 'system', 'service_request'));
