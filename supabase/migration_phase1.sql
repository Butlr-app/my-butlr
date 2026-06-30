-- Phase 1: Fondations manquantes
-- Tables: messages, service_requests, property_images

-- ─── Property Images (multi-image gallery) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage property_images" ON property_images FOR ALL TO authenticated USING (true);

-- ─── Service Requests (guest → concierge) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  guest_user_id UUID REFERENCES auth.users(id),
  service_id UUID REFERENCES services(id),
  service_name TEXT NOT NULL,
  details TEXT,
  preferred_date DATE,
  preferred_time TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage service_requests" ON service_requests FOR ALL TO authenticated USING (true);

-- ─── Messages (chat between guest and house manager) ────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage messages" ON messages FOR ALL TO authenticated USING (true);

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ─── Role Assignments (house_manager → properties) ──────────────────────────
CREATE TABLE IF NOT EXISTS role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('house_manager', 'concierge')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, property_id, role)
);

ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage role_assignments" ON role_assignments FOR ALL TO authenticated USING (true);
