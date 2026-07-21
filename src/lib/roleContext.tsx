import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './authContext'

export type Role = 'owner' | 'house_manager' | 'concierge' | 'agency' | 'partner' | 'guest'

const VALID_ROLES: Role[] = ['owner', 'house_manager', 'concierge', 'agency', 'partner', 'guest']

// Roles that operate the back-office dashboard under /app.
export const STAFF_ROLES: Role[] = ['owner', 'house_manager', 'concierge', 'agency']

// The root route a given role should land on after authentication.
export function roleHome(role: Role | null | undefined): string {
  if (role === 'partner') return '/partner'
  if (role === 'guest') return '/guest'
  return '/app'
}

interface RoleContextType {
  role: Role
  actualRole: Role
  canPreviewRoles: boolean
  roleLoading: boolean
  setRole: (role: Role) => void
}

// Least-privileged fallback: a user whose role cannot be determined gets guest
// access only. Elevated access must come from an explicit `profiles.role`.
const DEFAULT_ROLE: Role = 'guest'

const RoleContext = createContext<RoleContextType>({
  role: DEFAULT_ROLE,
  actualRole: DEFAULT_ROLE,
  canPreviewRoles: false,
  roleLoading: true,
  setRole: () => {},
})

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [actualRole, setActualRole] = useState<Role>(DEFAULT_ROLE)
  const [previewRole, setPreviewRole] = useState<Role | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadRole() {
      if (!user) {
        setActualRole(DEFAULT_ROLE)
        setPreviewRole(null)
        setRoleLoading(false)
        return
      }
      setRoleLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      const cacheKey = `cached-role:${user.id}`
      let dbRole = data?.role as Role | undefined
      if (error) {
        dbRole = (localStorage.getItem(cacheKey) as Role | null) ?? undefined
      } else if (dbRole) {
        try { localStorage.setItem(cacheKey, dbRole) } catch { /* best-effort */ }
      }
      setActualRole(dbRole && VALID_ROLES.includes(dbRole) ? dbRole : DEFAULT_ROLE)
      setPreviewRole(null)
      setRoleLoading(false)
    }
    loadRole()
    return () => { cancelled = true }
  }, [user])

  const canPreviewRoles = actualRole === 'owner'
  const role = canPreviewRoles && previewRole ? previewRole : actualRole

  const setRole = (r: Role) => {
    if (!canPreviewRoles) return
    setPreviewRole(r === actualRole ? null : r)
  }

  return (
    <RoleContext.Provider value={{ role, actualRole, canPreviewRoles, roleLoading, setRole }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
