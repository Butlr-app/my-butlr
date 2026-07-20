-- Phase 4.1 — Inventory
-- Per-villa consumable stock (welcome products, linen, cleaning supplies...)
-- with alert thresholds, an auditable movement log and a derived shopping
-- list. Access follows property assignment (same model as incidents).

-- Allow the 'inventory' notification type.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['reservation','task','payment','system','service_request','incident','work_order','inspection','inventory']));

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('welcome_products','linen','cleaning','maintenance','food_beverage','other')),
  unit TEXT NOT NULL DEFAULT 'unit',
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  threshold INTEGER NOT NULL DEFAULT 0 CHECK (threshold >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_property ON public.inventory_items(property_id);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT NOT NULL DEFAULT 'adjustment' CHECK (reason IN ('restock','usage','loss','adjustment')),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON public.inventory_movements(item_id);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property staff read inventory items"
  ON inventory_items FOR SELECT TO authenticated
  USING (can_access_property(property_id));

CREATE POLICY "Property staff create inventory items"
  ON inventory_items FOR INSERT TO authenticated
  WITH CHECK (can_access_property(property_id) AND created_by = auth.uid());

CREATE POLICY "Property staff update inventory items"
  ON inventory_items FOR UPDATE TO authenticated
  USING (can_access_property(property_id))
  WITH CHECK (can_access_property(property_id));

CREATE POLICY "Owners delete inventory items"
  ON inventory_items FOR DELETE TO authenticated
  USING (is_app_owner());

CREATE POLICY "Property staff read inventory movements"
  ON inventory_movements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.inventory_items i
    WHERE i.id = item_id AND can_access_property(i.property_id)
  ));

CREATE POLICY "Property staff record inventory movements"
  ON inventory_movements FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.inventory_items i
      WHERE i.id = item_id AND can_access_property(i.property_id)
    )
  );

-- Movements are an audit log: no UPDATE/DELETE policies (immutable for
-- everyone; owners can only remove them by deleting the item, which cascades).

CREATE OR REPLACE FUNCTION public.inventory_items_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_items_touch ON public.inventory_items;
CREATE TRIGGER trg_inventory_items_touch
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.inventory_items_touch();

-- A movement is the single source of truth for stock changes: applying it
-- updates the item quantity atomically and rejects negative stock.
CREATE OR REPLACE FUNCTION public.apply_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
  new_qty INTEGER;
BEGIN
  UPDATE public.inventory_items
    SET quantity = quantity + NEW.delta
    WHERE id = NEW.item_id
    RETURNING quantity INTO new_qty;
  IF new_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for this movement';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_apply_inventory_movement ON public.inventory_movements;
CREATE TRIGGER trg_apply_inventory_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_movement();

-- Notify villa staff + owners (excluding the actor) when an item crosses
-- below its alert threshold. Fires only on the downward crossing so a
-- low item doesn't spam a notification on every later movement.
CREATE OR REPLACE FUNCTION public.notify_inventory_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= NEW.threshold AND OLD.quantity > OLD.threshold AND NEW.threshold > 0 THEN
    INSERT INTO public.notifications (user_id, type, title, message, data, related_id, read)
    SELECT DISTINCT r.uid, 'inventory', 'Low stock alert',
           'Low stock: ' || NEW.name || ' (' || NEW.quantity || ' ' || NEW.unit || ' left)',
           jsonb_build_object('name', NEW.name, 'quantity', NEW.quantity, 'threshold', NEW.threshold), NEW.id, false
    FROM (
      SELECT ra.user_id AS uid
        FROM public.role_assignments ra
        WHERE ra.property_id = NEW.property_id
      UNION
      SELECT p.id
        FROM public.profiles p
        WHERE p.role = 'owner'
    ) r
    WHERE r.uid IS NOT NULL
      AND r.uid IS DISTINCT FROM auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_inventory_low_stock ON public.inventory_items;
CREATE TRIGGER trg_notify_inventory_low_stock
  AFTER UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_inventory_low_stock();
