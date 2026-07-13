import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RoleProvider, useRole, roleHome } from '../roleContext'

function wrapper({ children }: { children: ReactNode }) {
  return <RoleProvider>{children}</RoleProvider>
}

describe('roleHome', () => {
  it('routes guest and partner to mobile shells', () => {
    expect(roleHome('guest')).toBe('/guest')
    expect(roleHome('partner')).toBe('/partner')
  })

  it('routes field staff to /hm', () => {
    expect(roleHome('house_manager')).toBe('/hm')
    expect(roleHome('concierge')).toBe('/hm')
  })

  it('routes owners and agencies to /app', () => {
    expect(roleHome('owner')).toBe('/app')
    expect(roleHome('agency')).toBe('/app')
    expect(roleHome(null)).toBe('/app')
    expect(roleHome(undefined)).toBe('/app')
  })
})

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
