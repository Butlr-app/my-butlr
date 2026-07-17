import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from, inFn, order, select, setQueryResult } = vi.hoisted(() => {
  let queryResult: { data: unknown; error: null | { message: string } } = {
    data: [],
    error: null,
  }

  const order = vi.fn()
  order.mockImplementation(() => ({
    order,
    then: (resolve: (value: typeof queryResult) => unknown) =>
      Promise.resolve(queryResult).then(resolve),
  }))

  const inFn = vi.fn(() => ({ order }))
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ order })), in: inFn }))
  const from = vi.fn(() => ({ select }))

  return {
    from,
    inFn,
    order,
    select,
    setQueryResult: (next: typeof queryResult) => {
      queryResult = next
    },
  }
})

vi.mock('./supabase', () => ({
  supabase: { from },
}))

import {
  fetchOwnerProviderInvoices,
  MAX_PROVIDER_INVOICE_SIZE,
  providerInvoiceTransitions,
  validateProviderInvoiceInput,
  type ProviderInvoiceInput,
} from './providerOperations'

function input(overrides: Partial<ProviderInvoiceInput> = {}): ProviderInvoiceInput {
  return {
    partnerId: 'partner-1',
    propertyId: 'property-1',
    issueDate: '2026-07-16',
    amount: 240,
    file: new File(['invoice'], 'facture.pdf', { type: 'application/pdf' }),
    ...overrides,
  }
}

describe('provider invoices', () => {
  beforeEach(() => {
    from.mockClear()
    select.mockClear()
    inFn.mockClear()
    order.mockClear()
    setQueryResult({ data: [], error: null })
  })

  it('accepts a valid PDF invoice', () => {
    expect(validateProviderInvoiceInput(input())).toBeNull()
  })

  it('requires a property and a valid amount', () => {
    expect(validateProviderInvoiceInput(input({ propertyId: '' }))).toBe(
      'Sélectionnez une villa.',
    )
    expect(validateProviderInvoiceInput(input({ amount: Number.NaN }))).toBe(
      'Le montant de la facture est invalide.',
    )
  })

  it('rejects unsupported or oversized files', () => {
    expect(validateProviderInvoiceInput(input({
      file: new File(['text'], 'facture.txt', { type: 'text/plain' }),
    }))).toContain('PDF')

    const oversized = new File(['x'], 'facture.pdf', { type: 'application/pdf' })
    Object.defineProperty(oversized, 'size', { value: MAX_PROVIDER_INVOICE_SIZE + 1 })
    expect(validateProviderInvoiceInput(input({ file: oversized }))).toContain('15 Mo')
  })

  it('enforces a forward-only invoice workflow', () => {
    expect(providerInvoiceTransitions.received).toEqual(['approved', 'rejected'])
    expect(providerInvoiceTransitions.approved).toEqual(['paid', 'rejected'])
    expect(providerInvoiceTransitions.rejected).toEqual(['received'])
    expect(providerInvoiceTransitions.paid).toEqual([])
  })

  it('returns an empty list when aggregating invoices without properties', async () => {
    const result = await fetchOwnerProviderInvoices([])
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('aggregates provider invoices across owner properties', async () => {
    setQueryResult({ data: [{ id: 'inv-1' }], error: null })
    const result = await fetchOwnerProviderInvoices(['property-1', 'property-2'])
    expect(from).toHaveBeenCalledWith('provider_invoices')
    expect(inFn).toHaveBeenCalledWith('property_id', ['property-1', 'property-2'])
    expect(result.data).toEqual([{ id: 'inv-1' }])
  })
})
