import type { Payment, Partner } from './useSupabase'

// APA — Automated Payout Allocation.
// The platform collects 100% of guest payments (encaissement), then reverses each
// beneficiary their net share: villas get the rent net of platform commission,
// partners get the service amount net of their commission.

export const DEFAULT_PLATFORM_RATE = 15

export interface PayoutDraft {
  payment_id: string
  reservation_id: string | null
  payee_type: 'villa' | 'partner'
  payee_name: string
  gross_amount: number
  commission_rate: number
  commission_amount: number
  net_amount: number
  status: 'pending'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// A payment is reversible (generates a payout) when it has been collected and is
// not a platform-retained commission line. `commission` payments are revenue the
// platform keeps, so they are not reversed.
export function isReversible(p: Payment): boolean {
  return p.status === 'paid' && (p.type === 'booking' || p.type === 'deposit' || p.type === 'service')
}

export function computePayout(p: Payment, partners: Partner[], platformRate: number): PayoutDraft | null {
  if (!isReversible(p)) return null
  const gross = Number(p.amount)

  if (p.type === 'service') {
    // Prefer the explicit partner_id link; fall back to name match for legacy
    // payments recorded before partner_id was introduced.
    const partner = (p.partner_id && partners.find(pt => pt.id === p.partner_id))
      || partners.find(pt => pt.name.toLowerCase() === p.guest_name.toLowerCase())
    const rate = partner ? Number(partner.commission) : platformRate
    const commission = round2((gross * rate) / 100)
    return {
      payment_id: p.id,
      reservation_id: p.reservation_id,
      payee_type: 'partner',
      payee_name: partner?.name ?? p.guest_name,
      gross_amount: gross,
      commission_rate: rate,
      commission_amount: commission,
      net_amount: round2(gross - commission),
      status: 'pending',
    }
  }

  // booking / deposit -> the villa (owner) receives the rent net of platform commission
  const commission = round2((gross * platformRate) / 100)
  return {
    payment_id: p.id,
    reservation_id: p.reservation_id,
    payee_type: 'villa',
    payee_name: p.property_name ?? 'Villa',
    gross_amount: gross,
    commission_rate: platformRate,
    commission_amount: commission,
    net_amount: round2(gross - commission),
    status: 'pending',
  }
}

// Build payout drafts for every collected payment that does not yet have one.
export function buildPayoutDrafts(
  payments: Payment[],
  partners: Partner[],
  existingPaymentIds: Set<string>,
  platformRate: number,
): PayoutDraft[] {
  return payments
    .filter(p => isReversible(p) && !existingPaymentIds.has(p.id))
    .map(p => computePayout(p, partners, platformRate))
    .filter((d): d is PayoutDraft => d !== null)
}
