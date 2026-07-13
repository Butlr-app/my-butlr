import type { Role } from './roleContext'

/** Roles available on the public signup form. Staff roles require an admin invite. */
export const PUBLIC_SIGNUP_ROLES: { value: Role; label: string }[] = [
  { value: 'partner', label: 'Partner' },
]

export const PUBLIC_SIGNUP_DEFAULT_ROLE: Role = 'partner'

const PUBLIC_SIGNUP_ROLE_VALUES = new Set(PUBLIC_SIGNUP_ROLES.map((r) => r.value))

export function sanitizeSignupRole(role?: string | null): Role {
  if (role && PUBLIC_SIGNUP_ROLE_VALUES.has(role as Role)) {
    return role as Role
  }
  return PUBLIC_SIGNUP_DEFAULT_ROLE
}
