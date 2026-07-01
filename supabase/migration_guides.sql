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

-- Policy: authenticated users can read published guides
CREATE POLICY "Anyone can read published guides"
  ON guides FOR SELECT
  USING (published = true);

-- Policy: authenticated users can manage guides (owner/manager handle on frontend)
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

-- Policy: authenticated users can also read unpublished guides (for management)
CREATE POLICY "Authenticated users can read all guides"
  ON guides FOR SELECT
  TO authenticated
  USING (true);
