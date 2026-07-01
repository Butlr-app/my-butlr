-- Service Providers Directory
-- Stores service provider contacts for house managers and property owners

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

-- Enable RLS
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (scoped by app-level role filtering)
CREATE POLICY "Authenticated users can view service providers"
  ON service_providers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert service providers"
  ON service_providers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update service providers"
  ON service_providers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete service providers"
  ON service_providers FOR DELETE
  TO authenticated
  USING (true);
