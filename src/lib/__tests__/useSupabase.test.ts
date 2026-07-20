import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProperties, useServices, useTasks, usePartners, usePayments, useContracts } from '../useSupabase'

// Mock the supabase client
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockIn = vi.fn()

function createChain(data: unknown[] | null, error: unknown = null) {
  const result = { data, error }
  mockSingle.mockReturnValue(Promise.resolve({ data: data?.[0] ?? null, error }))
  mockOrder.mockReturnValue(Promise.resolve(result))
  mockEq.mockReturnValue({ select: () => ({ single: mockSingle }), order: mockOrder })
  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, in: mockIn })
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockDelete.mockReturnValue({ eq: mockEq })
}

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnValue({ subscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useProperties', () => {
  it('fetches properties on mount', async () => {
    const mockData = [
      { id: '1', name: 'Villa Azure', type: 'villa', status: 'active', created_at: '2024-01-01' },
      { id: '2', name: 'Yacht Luna', type: 'yacht', status: 'active', created_at: '2024-01-02' },
    ]
    createChain(mockData)

    const { result } = renderHook(() => useProperties())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    createChain(null, { message: 'Network error' })
    mockOrder.mockReturnValue(Promise.resolve({ data: null, error: { message: 'Network error' } }))

    const { result } = renderHook(() => useProperties())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual([])
    expect(result.current.error).toBe('Network error')
  })
})

describe('useServices', () => {
  it('fetches services', async () => {
    const mockData = [{ id: '1', name: 'Private Chef', category: 'dining', created_at: '2024-01-01' }]
    createChain(mockData)

    const { result } = renderHook(() => useServices())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
  })
})

describe('useTasks', () => {
  it('fetches tasks', async () => {
    const mockData = [{ id: '1', title: 'Clean pool', status: 'todo', created_at: '2024-01-01' }]
    createChain(mockData)

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
  })
})

describe('usePartners', () => {
  it('fetches partners', async () => {
    const mockData = [{ id: '1', name: 'Luxury Transport', status: 'active', created_at: '2024-01-01' }]
    createChain(mockData)

    const { result } = renderHook(() => usePartners())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
  })
})

describe('usePayments', () => {
  it('fetches payments', async () => {
    const mockData = [{ id: '1', guest_name: 'John', amount: 500, status: 'paid', created_at: '2024-01-01' }]
    createChain(mockData)

    const { result } = renderHook(() => usePayments())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
  })
})

describe('useContracts', () => {
  it('fetches contracts', async () => {
    const mockData = [{ id: '1', guest_name: 'Jane', status: 'draft', created_at: '2024-01-01' }]
    createChain(mockData)

    const { result } = renderHook(() => useContracts())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
  })
})
