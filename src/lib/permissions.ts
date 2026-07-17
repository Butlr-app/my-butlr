import type { Role } from './roleContext'

/** Capabilities gated in the SaaS app for team roles. */
export type AppCapability =
  | 'dashboard'
  | 'properties'
  | 'properties_create'
  | 'properties_delete'
  | 'reservations'
  | 'reservation_amounts'
  | 'calendar'
  | 'tasks'
  | 'operations'
  | 'guest_portal'
  | 'messages'
  | 'stay_reserves'
  | 'services'
  | 'boutique'
  | 'payments'
  | 'contracts'
  | 'invoices'
  | 'reports'
  | 'partners'
  | 'settings'
  | 'team_manage'

export type PermissionMap = Record<AppCapability, boolean>

export const APP_CAPABILITIES: AppCapability[] = [
  'dashboard',
  'properties',
  'properties_create',
  'properties_delete',
  'reservations',
  'reservation_amounts',
  'calendar',
  'tasks',
  'operations',
  'guest_portal',
  'messages',
  'stay_reserves',
  'services',
  'boutique',
  'payments',
  'contracts',
  'invoices',
  'reports',
  'partners',
  'settings',
  'team_manage',
]

export const capabilityLabels: Record<AppCapability, string> = {
  dashboard: 'Tableau de bord',
  properties: 'Voir les propriétés',
  properties_create: 'Créer une propriété',
  properties_delete: 'Supprimer une propriété',
  reservations: 'Réservations',
  reservation_amounts: 'Montants des réservations',
  calendar: 'Calendrier',
  tasks: 'Tâches',
  operations: 'Entretien & travaux',
  guest_portal: 'Portail voyageur',
  messages: 'Messages séjour',
  stay_reserves: 'Réserve séjour',
  services: 'Services conciergerie',
  boutique: 'Boutique',
  payments: 'Paiements',
  contracts: 'Contrats',
  invoices: 'Factures',
  reports: 'Rapports',
  partners: 'Prestataires de services',
  settings: 'Paramètres',
  team_manage: 'Gérer l’équipe',
}

export const capabilityDescriptions: Partial<Record<AppCapability, string>> = {
  reservation_amounts:
    'Prix, totaux et détails financiers (réservations, paiements, rapports, factures, réserve séjour).',
  contracts: 'Accès aux contrats, modèles et signatures.',
  properties_delete: 'Toujours interdit pour le house manager.',
  team_manage: 'Inviter et gérer les membres d’équipe sur une propriété (réservé au propriétaire).',
  payments: 'Requiert aussi « Montants des réservations ».',
  reports: 'Requiert aussi « Montants des réservations ».',
  invoices: 'Requiert aussi « Montants des réservations ».',
}

/** Full owner access. */
export const OWNER_PERMISSIONS: PermissionMap = Object.fromEntries(
  APP_CAPABILITIES.map(key => [key, true]),
) as PermissionMap

/**
 * Default house manager = same as owner, except:
 * - no reservation amounts (and thus no payments / reports / invoices surfaces)
 * - no contracts
 * - never delete properties
 * - no team management (RLS is owner-only)
 */
export const DEFAULT_HOUSE_MANAGER_PERMISSIONS: PermissionMap = {
  ...OWNER_PERMISSIONS,
  reservation_amounts: false,
  contracts: false,
  properties_delete: false,
  payments: false,
  reports: false,
  invoices: false,
  team_manage: false,
}

/** Money-heavy surfaces that also require reservation_amounts. */
const AMOUNT_DEPENDENT_CAPABILITIES: AppCapability[] = [
  'payments',
  'reports',
  'invoices',
]

/** Capabilities the owner can toggle for house managers. */
export const HOUSE_MANAGER_CONFIGURABLE_CAPABILITIES: AppCapability[] = APP_CAPABILITIES.filter(
  key => key !== 'properties_delete',
)

export function normalizePermissionMap(
  raw: unknown,
  fallback: PermissionMap = DEFAULT_HOUSE_MANAGER_PERMISSIONS,
): PermissionMap {
  const base = { ...fallback }
  if (!raw || typeof raw !== 'object') {
    return { ...base, properties_delete: false }
  }
  const input = raw as Record<string, unknown>
  for (const key of APP_CAPABILITIES) {
    if (typeof input[key] === 'boolean') {
      base[key] = input[key] as boolean
    }
  }
  // Hard rule: house managers can never delete properties.
  base.properties_delete = false
  return base
}

export function intersectPermissionMaps(maps: PermissionMap[]): PermissionMap {
  if (maps.length === 0) return { ...DEFAULT_HOUSE_MANAGER_PERMISSIONS }
  const result = { ...maps[0] }
  for (const map of maps.slice(1)) {
    for (const key of APP_CAPABILITIES) {
      result[key] = Boolean(result[key] && map[key])
    }
  }
  result.properties_delete = false
  return result
}

export function permissionsForRole(
  role: Role | string | null | undefined,
  ownerHouseManagerTemplate?: unknown,
): PermissionMap {
  if (!role || role === 'owner') return { ...OWNER_PERMISSIONS }
  if (role === 'house_manager') {
    return normalizePermissionMap(ownerHouseManagerTemplate, DEFAULT_HOUSE_MANAGER_PERMISSIONS)
  }
  // Other roles: start restrictive; can be expanded later.
  return {
    ...Object.fromEntries(APP_CAPABILITIES.map(key => [key, false])) as PermissionMap,
    dashboard: true,
    properties: true,
    reservations: role === 'concierge' || role === 'agency',
    calendar: role === 'concierge' || role === 'agency',
    tasks: true,
    operations: role === 'agency',
    guest_portal: role === 'concierge' || role === 'agency',
    messages: role === 'concierge' || role === 'agency',
    stay_reserves: role === 'concierge' || role === 'agency',
    services: role === 'concierge' || role === 'agency',
    boutique: role === 'concierge' || role === 'agency',
    partners: role === 'agency',
    settings: false,
    properties_delete: false,
    reservation_amounts: false,
    contracts: false,
  }
}

/** Map sidebar / route paths to a required capability. */
export function capabilityForPath(pathname: string): AppCapability | null {
  if (pathname === '/app' || pathname === '/app/') return 'dashboard'
  if (pathname.startsWith('/app/properties/new')) return 'properties_create'
  if (pathname.startsWith('/app/properties')) return 'properties'
  if (pathname.startsWith('/app/reservations')) return 'reservations'
  if (pathname.startsWith('/app/calendar')) return 'calendar'
  if (pathname.startsWith('/app/tasks')) return 'tasks'
  if (pathname.startsWith('/app/operations')) return 'operations'
  if (pathname.startsWith('/app/guest-portal')) return 'guest_portal'
  if (pathname.startsWith('/app/messages')) return 'messages'
  if (pathname.startsWith('/app/stay-reserves')) return 'stay_reserves'
  if (pathname.startsWith('/app/services')) return 'services'
  if (pathname.startsWith('/app/boutique')) return 'boutique'
  if (pathname.startsWith('/app/payments')) return 'payments'
  if (pathname.startsWith('/app/contracts')) return 'contracts'
  if (pathname.startsWith('/app/invoices')) return 'invoices'
  if (pathname.startsWith('/app/reports')) return 'reports'
  if (pathname.startsWith('/app/partners')) return 'partners'
  if (pathname.startsWith('/app/settings')) return 'settings'
  return null
}

export function canAccessPath(permissions: PermissionMap, pathname: string): boolean {
  const capability = capabilityForPath(pathname)
  if (!capability) return true
  if (!permissions[capability]) return false
  if (
    AMOUNT_DEPENDENT_CAPABILITIES.includes(capability)
    && !permissions.reservation_amounts
  ) {
    return false
  }
  return true
}

/** Sidebar / capability checks that also respect amount-dependent surfaces. */
export function canCapability(
  permissions: PermissionMap,
  capability: AppCapability,
): boolean {
  if (!permissions[capability]) return false
  if (
    AMOUNT_DEPENDENT_CAPABILITIES.includes(capability)
    && !permissions.reservation_amounts
  ) {
    return false
  }
  return true
}

export function formatMaskedAmount(
  amount: number | null | undefined,
  canView: boolean,
  currency = 'EUR',
): string {
  if (!canView) return '•••'
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}
