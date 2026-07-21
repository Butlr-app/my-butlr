import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

let authState: { user: { id: string } | null; loading: boolean } = {
  user: null,
  loading: true,
}

vi.mock('../authContext', () => ({
  useAuth: () => authState,
}))

let profileResult: { data: { role: string } | null; error: unknown } = {
  data: null,
  error: null,
}

vi.mock('../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => profileResult,
        }),
      }),
    }),
  },
}))

import { RoleProvider, useRole } from '../roleContext'

function wrapper({ children }: { children: ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>
}

beforeEach(() => {
  authState = { user: null, loading: true }
  profileResult = { data: null, error: null }
})

describe('RoleContext', () => {
  it('falls back to the least-privileged guest role when unauthenticated', async () => {
    authState = { user: null, loading: false }
    const { result } = renderHook(() => useRole(), { wrapper })
    await waitFor(() => expect(result.current.roleLoading).toBe(false))
    expect(result.current.role).toBe('guest')
  })

  it('does not allow role preview for non-owner roles', async () => {
    authState = { user: null, loading: false }
    const { result } = renderHook(() => useRole(), { wrapper })
    await waitFor(() => expect(result.current.roleLoading).toBe(false))

    expect(result.current.canPreviewRoles).toBe(false)

    act(() => {
      result.current.setRole('concierge')
    })

    // Preview is gated to owners, so the role must not change.
    expect(result.current.role).toBe('guest')
  })

  it('keeps roleLoading true while auth is still resolving so ProtectedRoute does not redirect early', () => {
    // Regression: with the secure guest default, resolving the role before auth
    // settles would briefly report a guest role and redirect legitimate users.
    authState = { user: null, loading: true }
    const { result } = renderHook(() => useRole(), { wrapper })
    expect(result.current.roleLoading).toBe(true)
  })

  it('resolves the elevated role from profiles once auth has settled', async () => {
    authState = { user: { id: 'user-1' }, loading: false }
    profileResult = { data: { role: 'owner' }, error: null }
    const { result } = renderHook(() => useRole(), { wrapper })
    await waitFor(() => expect(result.current.roleLoading).toBe(false))
    expect(result.current.actualRole).toBe('owner')
    expect(result.current.canPreviewRoles).toBe(true)
  })
})
