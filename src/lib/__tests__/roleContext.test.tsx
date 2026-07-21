import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RoleProvider, useRole } from '../roleContext'

function wrapper({ children }: { children: ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>
}

describe('RoleContext', () => {
  it('falls back to the least-privileged guest role when unauthenticated', () => {
    const { result } = renderHook(() => useRole(), { wrapper })
    expect(result.current.role).toBe('guest')
  })

  it('does not allow role preview for non-owner roles', () => {
    const { result } = renderHook(() => useRole(), { wrapper })

    expect(result.current.canPreviewRoles).toBe(false)

    act(() => {
      result.current.setRole('concierge')
    })

    // Preview is gated to owners, so the role must not change.
    expect(result.current.role).toBe('guest')
  })
})
