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
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
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
  description TEXT,
  image_url TEXT,
  address TEXT,
  surface_m2 INTEGER,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
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
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'not_applicable')),
  contract_status TEXT DEFAULT 'none' CHECK (contract_status IN ('none', 'draft', 'sent', 'signed')),
  contract_mode TEXT NOT NULL DEFAULT 'none' CHECK (contract_mode IN ('to_prepare', 'already_done', 'concierge', 'none')),
  booking_kind TEXT NOT NULL DEFAULT 'guest' CHECK (booking_kind IN ('guest', 'owner_stay', 'marketing_event', 'blocked_dates', 'other')),
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
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  guest_name TEXT NOT NULL,
  property_name TEXT,
  type TEXT DEFAULT 'rental' CHECK (type IN ('rental', 'service', 'partnership')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired')),
  date DATE DEFAULT CURRENT_DATE,
  document_url TEXT,
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

-- RLS Policies (allow authenticated users to read all, write own)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties: owners see their own, team sees all
CREATE POLICY "Authenticated users can view properties" ON properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage properties" ON properties FOR ALL USING (owner_id = auth.uid());

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

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, COALESCE(new.raw_user_meta_data->>'role', 'owner'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
