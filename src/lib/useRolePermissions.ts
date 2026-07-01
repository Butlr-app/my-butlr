import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './authContext'

export interface PagePermission {
  view: boolean
  edit: boolean
}

export type RolePermissions = Record<string, Record<string, PagePermission>>

const CONFIGURABLE_PAGES = ['payments', 'partners', 'contracts', 'invoices', 'apa', 'reports', 'notifications'] as const
export type ConfigurablePage = typeof CONFIGURABLE_PAGES[number]
export { CONFIGURABLE_PAGES }

const DEFAULT_PERMISSIONS: RolePermissions = {
  house_manager: {
    payments: { view: true, edit: true },
    partners: { view: true, edit: false },
    contracts: { view: true, edit: true },
    invoices: { view: true, edit: true },
    apa: { view: true, edit: false },
    reports: { view: true, edit: false },
    notifications: { view: true, edit: true },
  },
  concierge: {
    payments: { view: true, edit: false },
    partners: { view: true, edit: false },
    contracts: { view: true, edit: false },
    invoices: { view: true, edit: false },
    apa: { view: false, edit: false },
    reports: { view: false, edit: false },
    notifications: { view: true, edit: false },
  },
}

export function useRolePermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permissions')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (!error && data?.permissions) {
      setPermissions(data.permissions as RolePermissions)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const savePermissions = async (updated: RolePermissions) => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('role_permissions')
      .upsert(
        { owner_id: user.id, permissions: updated, updated_at: new Date().toISOString() },
        { onConflict: 'owner_id' }
      )
    if (!error) {
      setPermissions(updated)
    }
    setSaving(false)
    return error
  }

  return { permissions, loading, saving, savePermissions, DEFAULT_PERMISSIONS }
}
