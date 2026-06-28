-- Feature: APA — centralized collection (encaissement) + payouts/reversements
-- The platform collects 100% of guest payments, then reverses each beneficiary
-- their net share (villa rent net of platform commission, partner service net of
-- commission). One payout row per source payment.

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id),
  payee_type TEXT NOT NULL CHECK (payee_type IN ('villa', 'partner')),
  payee_name TEXT NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  commission_rate INTEGER NOT NULL DEFAULT 0,
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
CREATE POLICY "Authenticated manage payouts" ON payouts FOR ALL TO authenticated USING (true) WITH CHECK (true);
