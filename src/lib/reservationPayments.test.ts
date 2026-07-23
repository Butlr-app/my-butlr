import { describe, expect, it } from 'vitest'
import {
  computeOwnerCollectedTotal,
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

  it('ne double pas la ligne booking et un versement', () => {
    const payments = [
      payment({ amount: 60000, type: 'booking', status: 'paid' }),
      payment({ id: 'pay-2', amount: 60000, type: 'installment', status: 'paid', notes: 'Solde final' }),
    ]
    expect(computePaidTotal(payments)).toBe(60000)
    expect(derivePaymentStatus(computePaidTotal(payments), 60000)).toBe('paid')
  })

  it('compte la ligne booking seule si paiement en une fois', () => {
    const payments = [payment({ amount: 60000, type: 'booking', status: 'paid' })]
    expect(computePaidTotal(payments)).toBe(60000)
  })

  it('agrège plusieurs réservations sans fusionner les lignes booking', () => {
    const payments = [
      payment({ id: 'pay-1', reservation_id: 'res-1', amount: 60000, type: 'booking', status: 'paid' }),
      payment({ id: 'pay-2', reservation_id: 'res-2', amount: 40000, type: 'booking', status: 'paid' }),
    ]
    expect(computeOwnerCollectedTotal(payments)).toBe(100000)
  })

  it('traduit les statuts', () => {
    expect(paymentStatusLabel('partial')).toBe('Partiel')
    expect(paymentStatusLabel('paid')).toBe('Payé')
  })
})
