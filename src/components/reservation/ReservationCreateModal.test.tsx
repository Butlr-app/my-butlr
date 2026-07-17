import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReservationCreateModal } from './ReservationCreateModal'
import type { Property, Reservation } from '@/lib/types'
import { MemoryRouter } from 'react-router-dom'

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  contractSingle: vi.fn(),
  uploadAndAnalyze: vi.fn(),
  extractContractText: vi.fn(),
  visionAnalyze: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
    storage: { from: vi.fn() },
  },
}))

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({
    user: { id: 'owner-1' },
    profile: { date_format: 'DD/MM/YYYY' },
  }),
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

vi.mock('@/lib/contractFiles', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/contractFiles')>()
  return {
    ...actual,
    uploadAndAnalyzeContractFiles: supabaseMocks.uploadAndAnalyze,
    extractContractText: supabaseMocks.extractContractText,
  }
})

vi.mock('@/lib/contractVision', () => ({
  analyzeContractWithVision: supabaseMocks.visionAnalyze,
}))

vi.mock('@/lib/propertyPricing', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/propertyPricing')>()
  return {
    ...actual,
    fetchPropertyPricing: vi.fn().mockResolvedValue({
      settings: null,
      seasons: [],
      overrides: [],
      error: null,
    }),
  }
})

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

const createdReservation: Reservation = {
  id: 'reservation-1',
  property_id: property.id,
  guest_name: 'Jeanne Martin',
  guest_email: null,
  guest_phone: null,
  arrival: '2026-08-01',
  departure: '2026-08-08',
  guests_count: 2,
  status: 'confirmed',
  payment_status: 'pending',
  contract_status: 'draft',
  contract_mode: 'to_prepare',
  booking_kind: 'guest',
  total_amount: 800,
  notes: null,
}

function configureSupabase() {
  const conflictQuery: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['eq', 'neq', 'lt', 'gt']) {
    conflictQuery[method] = vi.fn(() => conflictQuery)
  }
  conflictQuery.limit = supabaseMocks.limit.mockResolvedValue({ data: [], error: null })

  supabaseMocks.single.mockResolvedValue({ data: createdReservation, error: null })
  supabaseMocks.contractSingle.mockResolvedValue({ data: { id: 'contract-1' }, error: null })
  supabaseMocks.uploadAndAnalyze.mockResolvedValue({
    analysisStatus: 'completed',
    extractedData: {},
  })
  supabaseMocks.extractContractText.mockResolvedValue(
    'LOCATAIRE : Jeanne Martin\nMontant total : 800 EUR',
  )
  supabaseMocks.visionAnalyze.mockRejectedValue(new Error('Vision indisponible'))
  supabaseMocks.insert.mockReturnValue({
    select: vi.fn(() => ({ single: supabaseMocks.single })),
  })
  const contractQuery: Record<string, ReturnType<typeof vi.fn>> = {
    single: supabaseMocks.contractSingle,
  }
  contractQuery.eq = vi.fn(() => contractQuery)

  supabaseMocks.from.mockImplementation((table: string) => ({
    select: vi.fn(() => table === 'contracts' ? contractQuery : conflictQuery),
    insert: supabaseMocks.insert,
    delete: vi.fn(() => ({ eq: vi.fn() })),
    update: vi.fn(() => ({ eq: vi.fn() })),
  }))
}

function renderModal(onCreated = vi.fn()) {
  render(
    <MemoryRouter>
      <ReservationCreateModal
        open
        properties={[property]}
        onClose={vi.fn()}
        onCreated={onCreated}
      />
    </MemoryRouter>,
  )
  return onCreated
}

async function addContractFile(user: ReturnType<typeof userEvent.setup>) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  expect(input).not.toBeNull()
  await user.upload(
    input!,
    new File(['contract'], 'contrat.pdf', { type: 'application/pdf' }),
  )
}

async function completeGuestDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nom du client'), 'Jeanne Martin')
  await user.type(screen.getByLabelText(/Montant total/), '800')
}

async function submitGuestFlow(
  user: ReturnType<typeof userEvent.setup>,
  optionName: string,
  requiresFile: boolean,
) {
  await fillDates(user)
  await user.click(screen.getByRole('radio', { name: new RegExp(optionName) }))
  await completeGuestDetails(user)
  if (requiresFile) await addContractFile(user)
  await user.click(screen.getByRole('button', {
    name: requiresFile ? 'Créer et analyser le contrat' : 'Créer et préparer le contrat',
  }))
}

async function expectReservationMode(expectedMode: string) {
  await waitFor(() => expect(supabaseMocks.insert).toHaveBeenCalled())
  expect(supabaseMocks.insert.mock.calls.at(-1)?.[0]).toMatchObject({
    contract_mode: expectedMode,
    booking_kind: 'guest',
    guest_name: 'Jeanne Martin',
  })
}

async function fillDates(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Arrivée'), '01/08/2026')
  await user.type(screen.getByLabelText('Départ'), '08/08/2026')
}

describe('ReservationCreateModal', () => {
  beforeEach(() => {
    configureSupabase()
  })

  it('crée le parcours « contrat à préparer » et ouvre le modèle', async () => {
    const user = userEvent.setup()
    const onCreated = renderModal()
    await submitGuestFlow(user, 'Contrat à préparer', false)
    await expectReservationMode('to_prepare')
    expect(onCreated).toHaveBeenCalledOnce()
  })

  it.each([
    ['Contrat déjà fait', 'already_done', 'owner_upload'],
    ['Contrat par la conciergerie', 'concierge', 'concierge_upload'],
  ])('transfère et analyse le parcours « %s »', async (optionName, expectedMode, source) => {
    const user = userEvent.setup()
    renderModal()
    await submitGuestFlow(user, optionName, true)
    await expectReservationMode(expectedMode)
    await waitFor(() => expect(supabaseMocks.uploadAndAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 'reservation-1',
        contractId: 'contract-1',
        source,
        files: [expect.objectContaining({ name: 'contrat.pdf' })],
      }),
    ))
  })

  it('préremplit le client et le montant après l’analyse Vision du contrat importé', async () => {
    supabaseMocks.visionAnalyze.mockResolvedValueOnce({
      prefill: {
        guestName: 'Jeanne Martin',
        guestEmail: 'jeanne@example.com',
        guestPhone: null,
        arrival: '2026-08-01',
        departure: '2026-08-08',
        totalAmount: 1250,
      },
      model: 'gpt-4.1-mini',
    })
    const user = userEvent.setup()
    renderModal()
    await fillDates(user)
    await user.click(screen.getByRole('radio', { name: /Contrat déjà fait/ }))
    await addContractFile(user)

    await waitFor(() => {
      expect(screen.getByLabelText('Nom du client')).toHaveValue('Jeanne Martin')
      expect(screen.getByLabelText(/Montant total/)).toHaveValue(1250)
    })
    expect(screen.getByText(/Données détectées et préremplies par Vision/)).toBeInTheDocument()
    expect(screen.queryByText('Estimation automatique')).not.toBeInTheDocument()
  })

  it('crée un blocage de dates sans client, contrat ni paiement', async () => {
    const user = userEvent.setup()
    renderModal()

    await fillDates(user)
    await user.click(screen.getByRole('radio', { name: /Aucun contrat/ }))
    await user.selectOptions(screen.getByLabelText('Motif du blocage'), 'marketing_event')
    await user.type(screen.getByLabelText('Libellé'), 'Shooting photo')
    await user.click(screen.getByRole('button', { name: 'Bloquer les dates' }))

    await waitFor(() => expect(supabaseMocks.insert).toHaveBeenCalled())
    expect(supabaseMocks.insert.mock.calls.at(-1)?.[0]).toMatchObject({
      contract_mode: 'none',
      booking_kind: 'marketing_event',
      guest_name: 'Shooting photo',
      payment_status: 'not_applicable',
      total_amount: 0,
    })
  })

  it('refuse un chevauchement détecté', async () => {
    supabaseMocks.limit.mockResolvedValueOnce({
      data: [{ id: 'existing-reservation' }],
      error: null,
    })
    const user = userEvent.setup()
    renderModal()

    await fillDates(user)
    await user.click(screen.getByRole('radio', { name: /Aucun contrat/ }))
    await user.click(screen.getByRole('button', { name: 'Bloquer les dates' }))

    expect(await screen.findByText(/chevauchent déjà/)).toBeInTheDocument()
    expect(supabaseMocks.insert).not.toHaveBeenCalled()
  })
})
