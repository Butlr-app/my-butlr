-- Feature: Online check-in + guest signature
-- Table: checkins (one per reservation)

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
