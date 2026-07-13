import { describe, it, expect } from 'vitest'
import { sanitizeSignupRole, PUBLIC_SIGNUP_DEFAULT_ROLE } from '../signupRoles'

describe('signupRoles', () => {
  it('allows partner signup', () => {
    expect(sanitizeSignupRole('partner')).toBe('partner')
  })

  it('rejects staff roles on public signup', () => {
    expect(sanitizeSignupRole('owner')).toBe(PUBLIC_SIGNUP_DEFAULT_ROLE)
    expect(sanitizeSignupRole('house_manager')).toBe(PUBLIC_SIGNUP_DEFAULT_ROLE)
    expect(sanitizeSignupRole('concierge')).toBe(PUBLIC_SIGNUP_DEFAULT_ROLE)
    expect(sanitizeSignupRole('agency')).toBe(PUBLIC_SIGNUP_DEFAULT_ROLE)
  })

  it('defaults unknown roles to partner', () => {
    expect(sanitizeSignupRole(undefined)).toBe('partner')
    expect(sanitizeSignupRole('admin')).toBe('partner')
  })
})
