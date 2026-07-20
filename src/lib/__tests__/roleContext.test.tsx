import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RoleProvider, useRole } from '../roleContext'

function wrapper({ children }: { children: ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>
}

describe('RoleContext', () => {
  it('defaults to owner role', () => {
    const { result } = renderHook(() => useRole(), { wrapper })
    expect(result.current.role).toBe('owner')
  })

  it('allows changing role', () => {
    const { result } = renderHook(() => useRole(), { wrapper })

    act(() => {
      result.current.setRole('concierge')
    })

    expect(result.current.role).toBe('concierge')
  })

  it('supports all defined roles', () => {
    const roles = ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest'] as const
    const { result } = renderHook(() => useRole(), { wrapper })

    for (const role of roles) {
      act(() => {
        result.current.setRole(role)
      })
      expect(result.current.role).toBe(role)
    }
  })
})
