import { describe, expect, it } from 'vitest'
import {
  computePaidTotal,
  computeRemainingAmount,
  derivePaymentStatus,
  paymentStatusLabel,
  type ReservationPayment,
} from './reservationPayments'

const payment = (overrides: Partial<ReservationPayment>): ReservationPayment => ({
  id: 'pay-1',
  reservation_id: 'res-1',
  guest_name: 'Client',
  property_name: 'Villa',
  type: 'installment',
  amount: 0,
  status: 'paid',
  date: '2026-07-01',
  notes: null,
  ...overrides,
})

describe('reservationPayments', () => {
  it('calcule le total payé et le reste', () => {
    const payments = [
      payment({ amount: 10000, type: 'deposit' }),
      payment({ id: 'pay-2', amount: 5000, type: 'installment' }),
    ]
    expect(computePaidTotal(payments)).toBe(15000)
    expect(computeRemainingAmount(15000, 60000)).toBe(45000)
  })

  it('dérive le statut pending, partial et paid', () => {
    expect(derivePaymentStatus(0, 60000)).toBe('pending')
    expect(derivePaymentStatus(15000, 60000)).toBe('partial')
    expect(derivePaymentStatus(60000, 60000)).toBe('paid')
    expect(derivePaymentStatus(70000, 60000)).toBe('paid')
  })

  it('ignore les paiements non réglés dans le total', () => {
    const payments = [
      payment({ amount: 60000, type: 'booking', status: 'pending' }),
      payment({ amount: 10000, type: 'deposit', status: 'paid' }),
    ]
    expect(computePaidTotal(payments)).toBe(10000)
    expect(derivePaymentStatus(10000, 60000)).toBe('partial')
  })

  it('traduit les statuts', () => {
    expect(paymentStatusLabel('partial')).toBe('Partiel')
    expect(paymentStatusLabel('paid')).toBe('Payé')
  })
})
