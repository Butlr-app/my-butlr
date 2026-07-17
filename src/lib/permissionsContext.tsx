import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './authContext'
import { useRole } from './roleContext'
import { supabase } from './supabase'
import {
  DEFAULT_HOUSE_MANAGER_PERMISSIONS,
  OWNER_PERMISSIONS,
  canAccessPath,
  canCapability,
  intersectPermissionMaps,
  normalizePermissionMap,
  permissionsForRole,
  type AppCapability,
  type PermissionMap,
} from './permissions'

const RESTRICTED_BOOT_PERMISSIONS: PermissionMap = Object.fromEntries(
  Object.keys(OWNER_PERMISSIONS).map(key => [key, false]),
) as PermissionMap

interface PermissionsContextValue {
  permissions: PermissionMap
  loading: boolean
  can: (capability: AppCapability) => boolean
  canPath: (pathname: string) => boolean
  /** Owner template used when configuring HM rights (null for non-owners). */
  ownerHouseManagerTemplate: PermissionMap | null
  saveOwnerHouseManagerTemplate: (next: PermissionMap) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: RESTRICTED_BOOT_PERMISSIONS,
  loading: true,
  can: () => false,
  canPath: () => false,
  ownerHouseManagerTemplate: null,
  saveOwnerHouseManagerTemplate: async () => ({ error: null }),
  refresh: async () => {},
})

async function fetchOwnerTemplatesForHouseManager(userId: string): Promise<PermissionMap[]> {
  const { data: assignments, error } = await supabase
    .from('role_assignments')
    .select('property_id')
    .eq('user_id', userId)
    .eq('role', 'house_manager')

  if (error || !assignments?.length) {
    return [DEFAULT_HOUSE_MANAGER_PERMISSIONS]
  }

  const propertyIds = [...new Set(assignments.map(row => row.property_id).filter(Boolean))]
  if (propertyIds.length === 0) return [DEFAULT_HOUSE_MANAGER_PERMISSIONS]

  const { data: properties } = await supabase
    .from('properties')
    .select('owner_id')
    .in('id', propertyIds)

  const ownerIds = [...new Set(
    (properties ?? [])
      .map(row => row.owner_id)
      .filter((id): id is string => Boolean(id)),
  )]

  if (ownerIds.length === 0) return [DEFAULT_HOUSE_MANAGER_PERMISSIONS]

  const { data: owners } = await supabase
    .from('profiles')
    .select('id, house_manager_permissions')
    .in('id', ownerIds)

  if (!owners?.length) return [DEFAULT_HOUSE_MANAGER_PERMISSIONS]

  return owners.map(owner =>
    normalizePermissionMap(owner.house_manager_permissions, DEFAULT_HOUSE_MANAGER_PERMISSIONS),
  )
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const { role } = useRole()
  const [permissions, setPermissions] = useState<PermissionMap>(RESTRICTED_BOOT_PERMISSIONS)
  const [ownerTemplate, setOwnerTemplate] = useState<PermissionMap | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setPermissions(RESTRICTED_BOOT_PERMISSIONS)
      setOwnerTemplate(null)
      setLoading(false)
      return
    }

    // Wait for profile before granting any capability (avoids owner flash for HM).
    if (!profile) {
      setPermissions(RESTRICTED_BOOT_PERMISSIONS)
      setOwnerTemplate(null)
      setLoading(true)
      return
    }

    setLoading(true)

    if (role === 'owner') {
      const template = normalizePermissionMap(
        (profile as { house_manager_permissions?: unknown }).house_manager_permissions,
        DEFAULT_HOUSE_MANAGER_PERMISSIONS,
      )
      setOwnerTemplate(template)
      setPermissions(OWNER_PERMISSIONS)
      setLoading(false)
      return
    }

    setOwnerTemplate(null)

    if (role === 'house_manager') {
      const templates = await fetchOwnerTemplatesForHouseManager(user.id)
      setPermissions(intersectPermissionMaps(templates))
      setLoading(false)
      return
    }

    setPermissions(permissionsForRole(role))
    setLoading(false)
  }, [profile, role, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveOwnerHouseManagerTemplate = useCallback(async (next: PermissionMap) => {
    if (!user || role !== 'owner') {
      return { error: 'Seul le propriétaire peut modifier ces droits.' }
    }
    const normalized = normalizePermissionMap(next, DEFAULT_HOUSE_MANAGER_PERMISSIONS)
    const { error } = await supabase
      .from('profiles')
      .update({ house_manager_permissions: normalized })
      .eq('id', user.id)

    if (error) return { error: error.message }
    setOwnerTemplate(normalized)
    return { error: null }
  }, [role, user])

  const value = useMemo<PermissionsContextValue>(() => ({
    permissions,
    loading,
    can: (capability: AppCapability) => canCapability(permissions, capability),
    canPath: (pathname: string) => canAccessPath(permissions, pathname),
    ownerHouseManagerTemplate: ownerTemplate,
    saveOwnerHouseManagerTemplate,
    refresh,
  }), [loading, ownerTemplate, permissions, refresh, saveOwnerHouseManagerTemplate])

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
