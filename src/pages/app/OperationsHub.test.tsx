import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OperationsHub } from './OperationsHub'

const mocks = vi.hoisted(() => ({
  fetchOwnerProperties: vi.fn(),
  fetchManualPartners: vi.fn(),
  fetchMarketplacePartners: vi.fn(),
  fetchOwnerPartnerTasks: vi.fn(),
  fetchOwnerProviderInvoices: vi.fn(),
}))

vi.mock('@/lib/authContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1' }, profile: { date_format: 'DD/MM/YYYY' } }),
}))

vi.mock('@/lib/data', () => ({
  fetchOwnerProperties: mocks.fetchOwnerProperties,
}))

vi.mock('@/lib/partners', async () => {
  const actual = await vi.importActual<typeof import('@/lib/partners')>('@/lib/partners')
  return {
    ...actual,
    fetchManualPartners: mocks.fetchManualPartners,
    fetchMarketplacePartners: mocks.fetchMarketplacePartners,
  }
})

vi.mock('@/lib/tasks', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tasks')>('@/lib/tasks')
  return {
    ...actual,
    fetchOwnerPartnerTasks: mocks.fetchOwnerPartnerTasks,
    updateTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
  }
})

vi.mock('@/lib/providerOperations', async () => {
  const actual = await vi.importActual<typeof import('@/lib/providerOperations')>('@/lib/providerOperations')
  return {
    ...actual,
    fetchOwnerProviderInvoices: mocks.fetchOwnerProviderInvoices,
    createProviderInvoiceSignedUrl: vi.fn(),
    deleteProviderInvoice: vi.fn(),
    updateProviderInvoiceStatus: vi.fn(),
  }
})

vi.mock('@/components/partners/PartnerDetailModal', () => ({
  PartnerDetailModal: () => null,
}))
vi.mock('@/components/partners/PartnerFormModal', () => ({
  PartnerFormModal: () => null,
}))
vi.mock('@/components/partners/ProviderInvoiceFormModal', () => ({
  ProviderInvoiceFormModal: () => null,
}))
vi.mock('@/components/tasks/TaskFormModal', () => ({
  TaskFormModal: () => null,
}))

describe('OperationsHub', () => {
  beforeEach(() => {
    mocks.fetchOwnerProperties.mockResolvedValue({
      data: [{ id: 'property-1', name: 'Villa Azur' }],
      error: null,
    })
    mocks.fetchManualPartners.mockResolvedValue({ data: [], error: null })
    mocks.fetchMarketplacePartners.mockResolvedValue({ data: [], error: null })
    mocks.fetchOwnerPartnerTasks.mockResolvedValue({ data: [], error: null })
    mocks.fetchOwnerProviderInvoices.mockResolvedValue({ data: [], error: null })
  })

  it('affiche les KPI et les onglets du hub entretien', async () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<OperationsHub />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Entretien & travaux' })).toBeInTheDocument()
    })

    expect(screen.getByText('Tâches ouvertes')).toBeInTheDocument()
    expect(screen.getByText('Factures à traiter')).toBeInTheDocument()
    expect(screen.getByText('Montant impayé')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vue d’ensemble' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tâches' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Factures' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Intervenants' })).toBeInTheDocument()
  })

  it('ouvre l’onglet tâches depuis le deep-link assistant', async () => {
    render(
      <MemoryRouter initialEntries={['/app/operations?tab=tasks']}>
        <Routes>
          <Route path="/app/operations" element={<OperationsHub />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Entretien & travaux' })).toBeInTheDocument()
    })

    const tasksTab = screen.getByRole('button', { name: 'Tâches' })
    expect(tasksTab.className).toMatch(/bg-foreground|text-background/)
  })
})
