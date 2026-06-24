import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useContractTemplates } from '../useContractTemplates'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

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
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useContractTemplates', () => {
  it('fetches templates on mount', async () => {
    const mockData = [
      { id: '1', name: 'Rental Standard', template_data: {}, created_at: '2024-01-01', updated_at: '2024-01-01' },
    ]
    mockOrder.mockReturnValue(Promise.resolve({ data: mockData, error: null }))
    mockSelect.mockReturnValue({ order: mockOrder })

    const { result } = renderHook(() => useContractTemplates())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.templates).toEqual(mockData)
  })

  it('handles missing table gracefully', async () => {
    mockOrder.mockReturnValue(Promise.resolve({ data: null, error: { message: 'relation does not exist' } }))
    mockSelect.mockReturnValue({ order: mockOrder })

    const { result } = renderHook(() => useContractTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.templates).toEqual([])
  })

  it('saveTemplate inserts and updates local state', async () => {
    const newTemplate = { id: '2', name: 'New', user_id: 'user-1', template_data: { articles: [] }, created_at: '2024-01-01', updated_at: '2024-01-01' }
    mockOrder.mockReturnValue(Promise.resolve({ data: [], error: null }))
    mockSelect.mockReturnValue({ order: mockOrder })
    mockSingle.mockResolvedValue({ data: newTemplate, error: null })
    mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })

    const { result } = renderHook(() => useContractTemplates())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.saveTemplate('New', { articles: [] })
    })

    expect(result.current.templates).toHaveLength(1)
    expect(result.current.templates[0].name).toBe('New')
  })

  it('deleteTemplate removes from local state', async () => {
    const tpl = { id: '1', name: 'Old', template_data: {}, created_at: '2024-01-01', updated_at: '2024-01-01' }
    mockOrder.mockReturnValue(Promise.resolve({ data: [tpl], error: null }))
    mockSelect.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue(Promise.resolve({ error: null }))
    mockDelete.mockReturnValue({ eq: mockEq })

    const { result } = renderHook(() => useContractTemplates())

    await waitFor(() => {
      expect(result.current.templates).toHaveLength(1)
    })

    await act(async () => {
      await result.current.deleteTemplate('1')
    })

    expect(result.current.templates).toHaveLength(0)
  })
})
