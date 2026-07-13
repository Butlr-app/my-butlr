-- My Butlr Database Schema

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest')),
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  location TEXT,
  type TEXT DEFAULT 'villa' CHECK (type IN ('villa', 'yacht', 'apartment', 'chalet')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  bedrooms INTEGER DEFAULT 0,
  bathrooms INTEGER DEFAULT 0,
  max_guests INTEGER DEFAULT 0,
  surface_m2 INTEGER DEFAULT 0,
  units INTEGER DEFAULT 1,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  arrival DATE NOT NULL,
  departure DATE NOT NULL,
  guests_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  contract_status TEXT DEFAULT 'none' CHECK (contract_status IN ('none', 'draft', 'sent', 'signed')),
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  starting_price DECIMAL(10,2) DEFAULT 0,
  commission INTEGER DEFAULT 10,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to UUID REFERENCES profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Partners
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  location TEXT,
  contact TEXT,
  email TEXT,
  phone TEXT,
  commission INTEGER DEFAULT 10,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  rating DECIMAL(2,1) DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service Providers Directory
CREATE TABLE IF NOT EXISTS service_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  specialty TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  visit_days TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_backup BOOLEAN DEFAULT false,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read service_providers" ON service_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage service_providers" ON service_providers FOR ALL TO authenticated USING (true);

-- Service Requests
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
  partner_id UUID REFERENCES partners(id),
  quoted_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage service_requests" ON service_requests FOR ALL TO authenticated USING (true);

-- Enable Realtime for service requests
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  guest_name TEXT NOT NULL,
  property_name TEXT,
  type TEXT DEFAULT 'booking' CHECK (type IN ('booking', 'deposit', 'service', 'commission')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  date DATE DEFAULT CURRENT_DATE,
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  guest_name TEXT NOT NULL,
  property_name TEXT,
  type TEXT DEFAULT 'rental' CHECK (type IN ('rental', 'service', 'partnership')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'archived', 'expired')),
  date DATE DEFAULT CURRENT_DATE,
  document_url TEXT,
  signing_token TEXT,
  signing_expires_at TIMESTAMPTZ,
  signer_email TEXT,
  document_hash TEXT,
  signed_document_url TEXT,
  signed_at TIMESTAMPTZ,
  signature_hash TEXT,
  template_version TEXT,
  template_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar Events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'reservation' CHECK (type IN ('reservation', 'maintenance', 'cleaning', 'service', 'owner')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Property Amenities (many-to-many: property <-> amenity keys)
CREATE TABLE IF NOT EXISTS property_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, amenity_key)
);

-- Property Rooms (bedding, room types, variants)
CREATE TABLE IF NOT EXISTS property_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  room_name TEXT,
  variant TEXT DEFAULT 'private',
  bedding JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to read all, write own)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties: any authenticated user can manage (prototype); owner_id kept for future multi-tenancy
CREATE POLICY "Authenticated users can view properties" ON properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage properties" ON properties FOR ALL USING (owner_id = auth.uid());
CREATE POLICY "Authenticated manage properties" ON properties FOR ALL TO authenticated USING (true);

-- Broad read access for authenticated users on operational tables
CREATE POLICY "Authenticated read reservations" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert reservations" ON reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update reservations" ON reservations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated read services" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage services" ON services FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read tasks" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage tasks" ON tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read partners" ON partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage partners" ON partners FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage payments" ON payments FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read contracts" ON contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage contracts" ON contracts FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated read calendar" ON calendar_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage calendar" ON calendar_events FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated manage property_amenities" ON property_amenities FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated manage property_rooms" ON property_rooms FOR ALL TO authenticated USING (true);

-- ─── Contract Templates (user-customizable contract models) ──────────────────
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated manage contract_templates" ON contract_templates;
CREATE POLICY "Users read own templates"
  ON contract_templates FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users insert own templates"
  ON contract_templates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own templates"
  ON contract_templates FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own templates"
  ON contract_templates FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ─── Notifications table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('reservation', 'task', 'payment', 'system', 'service_request')),
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB DEFAULT '{}'::jsonb,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Authenticated insert notifications" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ─── Invoices table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_address TEXT,
  client_city TEXT,
  client_email TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_ht DECIMAL(12,2) DEFAULT 0,
  total_ttc DECIMAL(12,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  is_recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT DEFAULT NULL CHECK (recurring_interval IS NULL OR recurring_interval IN ('monthly', 'quarterly', 'yearly')),
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read invoices" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage invoices" ON invoices FOR ALL TO authenticated USING (true);

-- ─── Contract Signatures table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  signer_role TEXT NOT NULL DEFAULT 'tenant',
  signer_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read contract_signatures" ON contract_signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage contract_signatures" ON contract_signatures FOR ALL TO authenticated USING (true);
-- Public (token-based) signing is handled by the SECURITY DEFINER RPC
-- sign_contract_by_token (see migration_phase7_1_contract_token_security.sql),
-- so no permissive public policies are exposed on this table.

-- ─── Online check-ins table (guest check-in + electronic signature) ──────────────
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  guest_phone TEXT,
  address TEXT,
  nationality TEXT,
  id_doc_type TEXT DEFAULT 'passport' CHECK (id_doc_type IN ('passport', 'id_card', 'driver_license')),
  id_doc_number TEXT,
  num_guests INTEGER DEFAULT 1,
  estimated_arrival TEXT,
  special_requests TEXT,
  id_document_url TEXT,
  signature_data TEXT,
  rules_accepted BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reservation_id)
);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated manage checkins" ON checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── APA payouts table (centralized collection + reversements) ───────────────
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id),
  payee_type TEXT NOT NULL CHECK (payee_type IN ('villa', 'partner')),
  payee_name TEXT NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(payment_id)
);

CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_payee ON payouts(payee_type, payee_name);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner and agency manage payouts" ON payouts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'agency')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'agency')
    )
  );

-- Function to handle new user registration (public signup = owner only)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role TEXT;
BEGIN
  requested_role := lower(coalesce(new.raw_user_meta_data->>'role', 'owner'));
  -- Never accept elevated/staff roles from client metadata
  IF requested_role IS DISTINCT FROM 'owner' THEN
    requested_role := 'owner';
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    requested_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Guides ──────────────────────────────────────────────────────────────────

-- Guides feature: allows owners/managers to create instruction guides
-- for property equipment and amenities (spa, home automation, keys, etc.)

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general', 'spa', 'home_automation', 'entertainment', 'security',
    'kitchen', 'pool', 'heating_cooling', 'wifi_tech', 'outdoor', 'keys_access', 'cleaning'
  )),
  content TEXT,
  icon TEXT,
  published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

-- Policy: anyone (including anon) can read published guides (for guest portal)
CREATE POLICY "Anyone can read published guides"
  ON guides FOR SELECT
  USING (published = true);

-- Policy: authenticated users can manage guides (role check on frontend)
CREATE POLICY "Authenticated users can insert guides"
  ON guides FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update guides"
  ON guides FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete guides"
  ON guides FOR DELETE
  TO authenticated
  USING (true);

-- Policy: authenticated users can read all guides including drafts (for management UI)
CREATE POLICY "Authenticated users can read all guides"
  ON guides FOR SELECT
  TO authenticated
  USING (true);

-- ─── Inspections (état des lieux) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  inspector_name TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  reference_photo_url TEXT,
  current_photo_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ok', 'issue_found')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  room_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major')),
  photo_url TEXT,
  is_known_issue BOOLEAN DEFAULT false,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_rooms_inspection ON inspection_rooms(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_inspection ON inspection_reports(inspection_id);

ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated manage inspections" ON inspections FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated manage inspection_rooms" ON inspection_rooms FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated manage inspection_reports" ON inspection_reports FOR ALL TO authenticated USING (true);
