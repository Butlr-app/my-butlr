import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Reservations } from './Reservations'
import type { Property, Reservation } from '@/lib/types'
import { MemoryRouter } from 'react-router-dom'
import { ReservationDetailProvider } from '@/lib/reservationDetailContext'

const mocks = vi.hoisted(() => ({
  fetchOwnerReservations: vi.fn(),
  fetchOwnerProperties: vi.fn(),
  update: vi.fn(),
  single: vi.fn(),
}))

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1' }, profile: { date_format: 'DD/MM/YYYY' } }),
}))

vi.mock('@/lib/permissionsContext', () => ({
  usePermissions: () => ({
    can: () => true,
    canPath: () => true,
    loading: false,
    permissions: {},
    ownerHouseManagerTemplate: null,
    saveOwnerHouseManagerTemplate: async () => ({ error: null }),
    refresh: async () => {},
  }),
}))

vi.mock('@/lib/data', () => ({
  fetchOwnerReservations: mocks.fetchOwnerReservations,
  fetchOwnerProperties: mocks.fetchOwnerProperties,
  fetchReservationById: vi.fn(),
}))

function chainable(result: unknown = { data: null, error: null }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['select', 'eq', 'neq', 'order', 'limit', 'maybeSingle', 'single']) {
    query[method] = vi.fn(() => query)
  }
  query.then = vi.fn((resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)) as never
  query.maybeSingle = vi.fn(() => Promise.resolve(result))
  query.single = vi.fn(() => Promise.resolve(result))
  return query
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'payments') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          })),
        }
      }
      if (table === 'reservations') {
        return {
          select: vi.fn(() => chainable({ data: { portal_access_token: 'token-1' }, error: null })),
          update: mocks.update,
        }
      }
      if (table === 'stay_reserves') {
        return {
          select: vi.fn(() => chainable({ data: null, error: null })),
        }
      }
      return {
        select: vi.fn(() => chainable()),
        update: mocks.update,
      }
    }),
  },
}))

const property: Property = {
  id: 'property-1',
  owner_id: 'owner-1',
  name: 'Villa Azur',
  location: 'Nice',
  type: 'villa',
  status: 'active',
  bedrooms: 3,
  bathrooms: 2,
  max_guests: 6,
  description: null,
  image_url: null,
  address: null,
  surface_m2: null,
  amenities: null,
  created_at: '2026-01-01T00:00:00Z',
}

const reservation: Reservation = {
  id: 'reservation-1',
  property_id: property.id,
  guest_name: 'Jeanne Martin',
  guest_email: 'jeanne@example.com',
  guest_phone: '+33612345678',
  arrival: '2026-08-01',
  departure: '2026-08-08',
  guests_count: 2,
  status: 'confirmed',
  payment_status: 'pending',
  contract_status: 'draft',
  contract_mode: 'to_prepare',
  booking_kind: 'guest',
  total_amount: 800,
  notes: 'Arrivée tardive',
  properties: { name: property.name },
}

describe('Reservations', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mocks.fetchOwnerReservations.mockResolvedValue({ data: [reservation], error: null })
    mocks.fetchOwnerProperties.mockResolvedValue({ data: [property], error: null })
    mocks.single.mockResolvedValue({
      data: { ...reservation, status: 'cancelled' },
      error: null,
    })
    mocks.update.mockReturnValue({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ single: mocks.single })),
      })),
    })
  })

  it('affiche les détails complets puis annule la réservation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ReservationDetailProvider>
          <Reservations />
        </ReservationDetailProvider>
      </MemoryRouter>,
    )

    const row = await screen.findByRole('button', { name: /Jeanne Martin/ })
    await user.click(row)

    expect(screen.getByText('jeanne@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('800 €').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Annuler la réservation' }))

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ status: 'cancelled' }))
    await waitFor(() => expect(mocks.single).toHaveBeenCalledOnce())
  })

  it('empêche la création sur une propriété inactive', async () => {
    mocks.fetchOwnerReservations.mockResolvedValue({ data: [], error: null })
    mocks.fetchOwnerProperties.mockResolvedValue({
      data: [{ ...property, status: 'maintenance' }],
      error: null,
    })
    render(
      <MemoryRouter>
        <ReservationDetailProvider>
          <Reservations />
        </ReservationDetailProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: 'Nouvelle réservation' })).toBeDisabled()
    expect(screen.getByText('Ajoutez d’abord une propriété.')).toBeInTheDocument()
  })
})
