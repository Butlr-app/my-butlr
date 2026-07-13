import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RoleProvider, useRole } from '../roleContext'

const mockMaybeSingle = vi.fn()

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args),
        }),
      }),
    }),
  },
}))

vi.mock('../authContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMaybeSingle.mockResolvedValue({ data: { role: 'owner' }, error: null })
})

describe('RoleContext', () => {
  it('loads owner role from profile', async () => {
    const { result } = renderHook(() => useRole(), { wrapper })

    await waitFor(() => {
      expect(result.current.roleLoading).toBe(false)
    })

    expect(result.current.actualRole).toBe('owner')
    expect(result.current.role).toBe('owner')
  })

  it('falls back to guest when profile role is missing', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useRole(), { wrapper })

    await waitFor(() => {
      expect(result.current.roleLoading).toBe(false)
    })

    expect(result.current.actualRole).toBe('guest')
  })

  it('allows owner to preview other roles', async () => {
    const { result } = renderHook(() => useRole(), { wrapper })

    await waitFor(() => {
      expect(result.current.roleLoading).toBe(false)
    })

    act(() => {
      result.current.setRole('concierge')
    })

    expect(result.current.role).toBe('concierge')
    expect(result.current.actualRole).toBe('owner')
  })

  it('supports previewing all defined roles', async () => {
    const roles = ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest'] as const
    const { result } = renderHook(() => useRole(), { wrapper })

    await waitFor(() => {
      expect(result.current.roleLoading).toBe(false)
    })

    for (const role of roles) {
      act(() => {
        result.current.setRole(role)
      })
      expect(result.current.role).toBe(role)
    }
  })
})
