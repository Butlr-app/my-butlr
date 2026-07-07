-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 7.2 — Activity log / audit history per villa
-- ═══════════════════════════════════════════════════════════════════════════════
-- Records who did what, when, on which villa across the operational tables
-- (tasks, incidents, work orders, inspections, inventory, expenses, shifts).
-- Rows are written only by SECURITY DEFINER triggers; there are no client
-- INSERT/UPDATE/DELETE policies, so the log is tamper-proof. Reads are scoped
-- by can_access_property() → owners see all their villas, an HM sees only
-- villas they are assigned to.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID REFERENCES properties(id) ON DELETE CASCADE,
  actor_id     UUID,
  actor_name   TEXT,
  action       TEXT NOT NULL,          -- created | updated | status_changed | deleted
  entity_type  TEXT NOT NULL,          -- tasks | incidents | work_orders | ...
  entity_id    UUID,
  entity_title TEXT,
  new_status   TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_property_created
  ON activity_log (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_created
  ON activity_log (created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read activity for accessible villas" ON activity_log;
CREATE POLICY "Read activity for accessible villas"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    public.is_app_owner()
    OR (property_id IS NOT NULL AND public.can_access_property(property_id))
  );

-- ─── Generic audit trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_write_activity_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row      JSONB;
  v_old      JSONB;
  v_actor    UUID := auth.uid();
  v_name     TEXT;
  v_action   TEXT;
  v_status   TEXT;
  v_title    TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
  ELSE
    -- UPDATE: only record when a status column actually changed (avoid noise)
    v_old := to_jsonb(OLD);
    IF (v_row ? 'status') AND (v_row->>'status') IS DISTINCT FROM (v_old->>'status') THEN
      v_action := 'status_changed';
    ELSE
      RETURN NULL;
    END IF;
  END IF;

  v_status := v_row->>'status';
  v_title  := COALESCE(
    v_row->>'title', v_row->>'label', v_row->>'name',
    v_row->>'inspection_type', v_row->>'type', 'record'
  );

  SELECT full_name INTO v_name FROM profiles WHERE id = v_actor;

  INSERT INTO activity_log (
    property_id, actor_id, actor_name, action, entity_type,
    entity_id, entity_title, new_status, metadata
  )
  VALUES (
    NULLIF(v_row->>'property_id','')::UUID,
    v_actor,
    COALESCE(v_name, 'System'),
    v_action,
    TG_TABLE_NAME,
    NULLIF(v_row->>'id','')::UUID,
    v_title,
    v_status,
    jsonb_build_object('category', v_row->>'category', 'urgency', v_row->>'urgency')
  );

  RETURN NULL;
END;
$$;

-- ─── Attach to operational tables ────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tasks','incidents','work_orders','inspections','inventory_items','expenses','shifts'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_activity_log ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_activity_log AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION public.fn_write_activity_log()', t
    );
  END LOOP;
END;
$$;
