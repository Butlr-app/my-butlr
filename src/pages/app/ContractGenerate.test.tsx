import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ContractGenerate } from './ContractGenerate'
import type { Property } from '@/lib/types'
import type { PropertyPricingSettings } from '@/lib/propertyPricing'

const mocks = vi.hoisted(() => ({
  fetchProperties: vi.fn(),
  fetchPricing: vi.fn(),
}))

const villa: Property = {
  id: 'villa-1',
  owner_id: 'owner-1',
  name: 'Villa Azur',
  location: 'Saint-Tropez',
  type: 'villa',
  status: 'active',
  bedrooms: 5,
  bathrooms: 4,
  max_guests: 10,
  description: null,
  image_url: null,
  address: '10 avenue de la Mer, Saint-Tropez',
  surface_m2: 280,
  amenities: [],
  created_at: '2040-01-01T00:00:00Z',
}

const pricing: PropertyPricingSettings = {
  property_id: villa.id,
  currency: 'EUR',
  base_rate: 900,
  weekend_rate: 1100,
  cleaning_fee: 250,
  security_deposit: 3000,
  tourist_tax_per_person: 4,
  extra_guest_fee: 0,
  extra_guest_after: 10,
  minimum_stay: 3,
  maximum_stay: 30,
  check_in_time: '17:00',
  check_out_time: '11:00',
}

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1', email: 'owner@example.com' },
    profile: { date_format: 'DD/MM/YYYY' },
  }),
}))

vi.mock('@/lib/data', () => ({
  fetchOwnerProperties: mocks.fetchProperties,
}))

vi.mock('@/lib/propertyPricing', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/propertyPricing')>()
  return {
    ...actual,
    fetchPropertyPricing: mocks.fetchPricing,
  }
})

vi.mock('@/lib/contractFiles', () => ({
  uploadGeneratedContract: vi.fn(),
}))

vi.mock('@/lib/contractTemplates', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/contractTemplates')>()
  return {
    ...actual,
    fetchContractTemplates: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
})

vi.mock('@/lib/reservationDetailContext', () => ({
  useReservationDetail: () => ({ openReservation: vi.fn() }),
}))

describe('ContractGenerate', () => {
  it('préremplit le contrat depuis une résidence du propriétaire', async () => {
    mocks.fetchProperties.mockResolvedValue({ data: [villa], error: null })
    mocks.fetchPricing.mockResolvedValue({
      settings: pricing,
      seasons: [],
      overrides: [],
      error: null,
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ContractGenerate />
      </MemoryRouter>,
    )

    const select = await screen.findByLabelText('Résidence My Butlr')
    await user.selectOptions(select, villa.id)

    await waitFor(() => {
      expect(screen.getByLabelText('Nom de la propriété')).toHaveValue('Villa Azur')
      expect(screen.getByLabelText('Adresse de la propriété')).toHaveValue(villa.address)
      expect(screen.getByLabelText("Nombre maximum d'occupants")).toHaveValue(10)
      expect(screen.getByLabelText('Chambres')).toHaveValue(5)
      expect(screen.getByLabelText('Salles de bain')).toHaveValue(4)
      expect(screen.getByLabelText('Dépôt de garantie (€)')).toHaveValue(3000)
      expect(screen.getByLabelText('Heure d’arrivée')).toHaveValue('17:00')
      expect(screen.getByLabelText('Heure de départ')).toHaveValue('11:00')
    })
  })
})
