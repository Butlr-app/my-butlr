import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AGENCY_PERMISSIONS,
  DEFAULT_CONCIERGE_PERMISSIONS,
  DEFAULT_HOUSE_MANAGER_PERMISSIONS,
  OWNER_PERMISSIONS,
  canAccessPath,
  canCapability,
  firstAccessibleAppPath,
  formatMaskedAmount,
  intersectPermissionMaps,
  normalizePermissionMap,
  permissionsForRole,
} from './permissions'

describe('permissions', () => {
  it('donne au propriétaire tous les droits', () => {
    expect(permissionsForRole('owner').contracts).toBe(true)
    expect(permissionsForRole('owner').reservation_amounts).toBe(true)
    expect(permissionsForRole('owner').properties_delete).toBe(true)
    expect(permissionsForRole('owner').client_requests).toBe(false)
    expect(canAccessPath(OWNER_PERMISSIONS, '/app/client-requests')).toBe(false)
  })

  it('applique les défauts house manager sans montants, contrats, finance ni équipe', () => {
    const perms = permissionsForRole('house_manager')
    expect(perms.reservations).toBe(true)
    expect(perms.reservation_amounts).toBe(false)
    expect(perms.contracts).toBe(false)
    expect(perms.properties_delete).toBe(false)
    expect(perms.payments).toBe(false)
    expect(perms.reports).toBe(false)
    expect(perms.invoices).toBe(false)
    expect(perms.team_manage).toBe(false)
    expect(perms.client_requests).toBe(false)
    expect(perms.properties).toBe(true)
  })

  it('empêche toujours properties_delete même si le template l’active', () => {
    const perms = normalizePermissionMap({
      ...DEFAULT_HOUSE_MANAGER_PERMISSIONS,
      properties_delete: true,
      contracts: true,
    })
    expect(perms.properties_delete).toBe(false)
    expect(perms.contracts).toBe(true)
  })

  it('croise les templates de plusieurs propriétaires', () => {
    const a = { ...DEFAULT_HOUSE_MANAGER_PERMISSIONS, payments: true, reports: false }
    const b = { ...DEFAULT_HOUSE_MANAGER_PERMISSIONS, payments: false, reports: true }
    const merged = intersectPermissionMaps([a, b])
    expect(merged.payments).toBe(false)
    expect(merged.reports).toBe(false)
    expect(merged.properties_delete).toBe(false)
  })

  it('bloque contrats et surfaces financières dépendantes des montants', () => {
    expect(canAccessPath(DEFAULT_HOUSE_MANAGER_PERMISSIONS, '/app/contracts')).toBe(false)
    expect(canAccessPath(DEFAULT_HOUSE_MANAGER_PERMISSIONS, '/app/payments')).toBe(false)
    expect(canAccessPath(DEFAULT_HOUSE_MANAGER_PERMISSIONS, '/app/reports')).toBe(false)
    expect(canAccessPath(DEFAULT_HOUSE_MANAGER_PERMISSIONS, '/app/invoices')).toBe(false)
    expect(canAccessPath(DEFAULT_HOUSE_MANAGER_PERMISSIONS, '/app/reservations')).toBe(true)
    expect(canAccessPath(OWNER_PERMISSIONS, '/app/contracts')).toBe(true)
  })

  it('refuse payments/reports/invoices si montants désactivés même si la capability est true', () => {
    const perms = {
      ...DEFAULT_HOUSE_MANAGER_PERMISSIONS,
      reservation_amounts: false,
      payments: true,
      reports: true,
      invoices: true,
    }
    expect(canCapability(perms, 'payments')).toBe(false)
    expect(canAccessPath(perms, '/app/payments')).toBe(false)
    expect(canCapability(perms, 'reports')).toBe(false)
    expect(canCapability(perms, 'invoices')).toBe(false)

    const withAmounts = { ...perms, reservation_amounts: true }
    expect(canCapability(withAmounts, 'payments')).toBe(true)
    expect(canAccessPath(withAmounts, '/app/payments')).toBe(true)
  })

  it('masque les montants quand non autorisé', () => {
    expect(formatMaskedAmount(1200, false)).toBe('•••')
    expect(formatMaskedAmount(1200, true)).toContain('1')
  })

  it('donne à la conciergerie le parcours voyageur sans finance', () => {
    const perms = permissionsForRole('concierge')
    expect(perms).toEqual(DEFAULT_CONCIERGE_PERMISSIONS)
    expect(perms.services).toBe(true)
    expect(perms.boutique).toBe(true)
    expect(perms.stay_reserves).toBe(true)
    expect(perms.reservation_amounts).toBe(false)
    expect(perms.contracts).toBe(false)
    expect(perms.payments).toBe(false)
    expect(canAccessPath(perms, '/app/services')).toBe(true)
    expect(canAccessPath(perms, '/app/contracts')).toBe(false)
  })

  it('limite l’agence immo au calendrier et aux demandes clients', () => {
    const perms = permissionsForRole('agency')
    expect(perms).toEqual(DEFAULT_AGENCY_PERMISSIONS)
    expect(perms.calendar).toBe(true)
    expect(perms.client_requests).toBe(true)
    expect(perms.dashboard).toBe(false)
    expect(perms.reservations).toBe(false)
    expect(perms.contracts).toBe(false)
    expect(perms.reservation_amounts).toBe(false)
    expect(perms.payments).toBe(false)
    expect(perms.reports).toBe(false)
    expect(perms.partners).toBe(false)
    expect(canAccessPath(perms, '/app/calendar')).toBe(true)
    expect(canAccessPath(perms, '/app/client-requests')).toBe(true)
    expect(canAccessPath(perms, '/app/contracts')).toBe(false)
    expect(canAccessPath(perms, '/app/payments')).toBe(false)
    expect(canAccessPath(perms, '/app')).toBe(false)
    expect(firstAccessibleAppPath(perms)).toBe('/app/calendar')
  })

  it('bloque /app pour le partenaire marketplace', () => {
    const perms = permissionsForRole('partner')
    expect(perms.dashboard).toBe(false)
    expect(canAccessPath(perms, '/app')).toBe(false)
  })
})
