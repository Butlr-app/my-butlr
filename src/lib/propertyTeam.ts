import { supabase } from './supabase'

export type PropertyTeamRole = 'house_manager' | 'concierge' | 'maintenance' | 'partner'

export interface PropertyTeamMember {
  id: string
  user_id: string
  property_id: string
  role: PropertyTeamRole | string
  created_at: string
  profile: {
    full_name: string | null
    email: string | null
    phone: string | null
    avatar_url: string | null
  } | null
}

export interface PropertyTeamInvitation {
  id: string
  property_id: string
  email: string
  full_name: string
  role: PropertyTeamRole
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  message: string | null
  invited_by: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
}

export interface PropertyOwnerSummary {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
}

export const propertyTeamRoleLabels: Record<PropertyTeamRole, string> = {
  house_manager: 'House manager',
  concierge: 'Concierge',
  maintenance: 'Maintenance',
  partner: 'Partenaire / prestataire',
}

export const propertyTeamRoleDescriptions: Record<PropertyTeamRole, string> = {
  house_manager:
    'Par défaut : opérations villa sans montants, contrats, paiements/rapports, gestion d’équipe ni suppression. Configurable dans Paramètres → Rôles.',
  concierge: 'Relation voyageurs, services, demandes et coordination sur place.',
  maintenance: 'Interventions techniques, entretien et suivi des incidents.',
  partner: 'Prestataire externe (chef, ménage, spa…) avec accès limité.',
}

export const propertyTeamPermissions: {
  permission: string
  roles: Record<PropertyTeamRole, boolean>
}[] = [
  { permission: 'Voir la propriété', roles: { house_manager: true, concierge: true, maintenance: true, partner: true } },
  { permission: 'Gérer l’équipe', roles: { house_manager: false, concierge: false, maintenance: false, partner: false } },
  { permission: 'Gérer les réservations', roles: { house_manager: true, concierge: true, maintenance: false, partner: false } },
  { permission: 'Voir les montants des réservations', roles: { house_manager: false, concierge: false, maintenance: false, partner: false } },
  { permission: 'Contrats', roles: { house_manager: false, concierge: false, maintenance: false, partner: false } },
  { permission: 'Supprimer une propriété', roles: { house_manager: false, concierge: false, maintenance: false, partner: false } },
  { permission: 'Portail voyageur & services', roles: { house_manager: true, concierge: true, maintenance: false, partner: false } },
  { permission: 'Paiements', roles: { house_manager: false, concierge: false, maintenance: false, partner: false } },
  { permission: 'Maintenance & tâches', roles: { house_manager: true, concierge: false, maintenance: true, partner: false } },
  { permission: 'Accès prestataire limité', roles: { house_manager: false, concierge: false, maintenance: false, partner: true } },
]

function profileRoleForTeamRole(role: PropertyTeamRole): string {
  if (role === 'house_manager') return 'house_manager'
  if (role === 'concierge') return 'concierge'
  return 'partner'
}

export const PROPERTY_TEAM_ROLES = Object.keys(propertyTeamRoleLabels) as PropertyTeamRole[]

export function propertyTeamRoleLabel(role: string): string {
  return propertyTeamRoleLabels[role as PropertyTeamRole] ?? role
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function attachProfiles<T extends { user_id: string }>(
  rows: T[],
): Promise<(T & { profile: PropertyTeamMember['profile'] })[]> {
  if (rows.length === 0) return []

  const userIds = [...new Set(rows.map(row => row.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url')
    .in('id', userIds)

  const profileById = new Map((profiles ?? []).map(profile => [profile.id, profile]))

  return rows.map(row => ({
    ...row,
    profile: profileById.get(row.user_id) ?? null,
  }))
}

export async function fetchPropertyOwner(ownerId: string) {
  return supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', ownerId)
    .maybeSingle()
}

export async function fetchPropertyTeamMembers(propertyId: string) {
  const { data, error } = await supabase
    .from('role_assignments')
    .select('id, user_id, property_id, role, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: true })

  if (error) return { data: [] as PropertyTeamMember[], error }

  const members = await attachProfiles(data ?? [])
  return { data: members as PropertyTeamMember[], error: null }
}

export async function fetchPropertyTeamInvitations(propertyId: string) {
  return supabase
    .from('property_team_invitations')
    .select('*')
    .eq('property_id', propertyId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
}

export async function findProfileByEmail(email: string) {
  return supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .ilike('email', normalizeEmail(email))
    .maybeSingle()
}

export async function invitePropertyTeamMember(input: {
  propertyId: string
  fullName: string
  email: string
  role: PropertyTeamRole
  message?: string
  invitedBy: string
}) {
  const email = normalizeEmail(input.email)
  const profileResult = await findProfileByEmail(email)

  if (profileResult.data?.id) {
    const { data, error } = await supabase
      .from('role_assignments')
      .upsert({
        user_id: profileResult.data.id,
        property_id: input.propertyId,
        role: input.role,
      }, { onConflict: 'user_id,property_id,role' })
      .select('id, user_id, property_id, role, created_at')
      .single()

    if (error || !data) return { data: null, error, kind: 'member' as const }

    // Promote non-owner profiles to the invited team role (never demote an owner).
    if (profileResult.data.role !== 'owner') {
      await supabase
        .from('profiles')
        .update({ role: profileRoleForTeamRole(input.role) })
        .eq('id', profileResult.data.id)
    }

    const [member] = await attachProfiles([data])
    return { data: member as PropertyTeamMember, error: null, kind: 'member' as const }
  }

  const { data, error } = await supabase
    .from('property_team_invitations')
    .insert({
      property_id: input.propertyId,
      email,
      full_name: input.fullName.trim(),
      role: input.role,
      message: input.message?.trim() || null,
      invited_by: input.invitedBy,
      status: 'pending',
    })
    .select('*')
    .single()

  return { data: data as PropertyTeamInvitation | null, error, kind: 'invitation' as const }
}

export async function updatePropertyTeamMemberRole(
  assignmentId: string,
  userId: string,
  propertyId: string,
  role: PropertyTeamRole,
) {
  const { error: deleteError } = await supabase
    .from('role_assignments')
    .delete()
    .eq('id', assignmentId)

  if (deleteError) return { data: null, error: deleteError }

  const { data, error } = await supabase
    .from('role_assignments')
    .insert({
      user_id: userId,
      property_id: propertyId,
      role,
    })
    .select('id, user_id, property_id, role, created_at')
    .single()

  if (error || !data) return { data: null, error }

  const [member] = await attachProfiles([data])
  return { data: member as PropertyTeamMember, error: null }
}

export async function removePropertyTeamMember(assignmentId: string) {
  return supabase.from('role_assignments').delete().eq('id', assignmentId)
}

export async function cancelPropertyTeamInvitation(invitationId: string) {
  return supabase
    .from('property_team_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)
    .select('*')
    .single()
}

export async function resendPropertyTeamInvitation(invitationId: string) {
  return supabase
    .from('property_team_invitations')
    .update({
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    })
    .eq('id', invitationId)
    .select('*')
    .single()
}
