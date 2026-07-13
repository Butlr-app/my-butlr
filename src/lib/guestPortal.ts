import { normalizeRichContentForSave } from './guideContent'
import { normalizeEmergencyContactsForSave } from './emergencyContacts'
import { supabase } from './supabase'

export type GuestGuideCategory =
  | 'general'
  | 'access'
  | 'wifi'
  | 'house_rules'
  | 'local'
  | 'pool'
  | 'parking'
  | 'emergency'
  | 'services'
  | 'other'

export interface GuestPortalSettings {
  property_id: string
  enabled: boolean
  welcome_title: string | null
  welcome_message: string | null
  wifi_name: string | null
  wifi_password: string | null
  check_in_instructions: string | null
  check_out_instructions: string | null
  house_rules: string | null
  emergency_contact: string | null
  require_online_checkin: boolean
  show_services: boolean
  show_boutique?: boolean
  boutique_welcome_text?: string | null
  show_messaging?: boolean
  message_contact_role?: 'house_manager' | 'concierge'
  updated_at?: string
}

export interface GuestGuide {
  id: string
  property_id: string
  title: string
  category: GuestGuideCategory | string
  content: string
  icon: string | null
  published: boolean
  sort_order: number
}

export const guestGuideCategoryLabels: Record<GuestGuideCategory, string> = {
  general: 'Général',
  access: 'Accès & codes',
  wifi: 'Wi-Fi',
  house_rules: 'Règlement',
  local: 'Bonnes adresses',
  pool: 'Piscine & spa',
  parking: 'Parking',
  emergency: 'Urgences',
  services: 'Services',
  other: 'Autre',
}

export function defaultGuestPortalSettings(propertyId: string): GuestPortalSettings {
  return {
    property_id: propertyId,
    enabled: true,
    welcome_title: 'Bienvenue',
    welcome_message: null,
    wifi_name: null,
    wifi_password: null,
    check_in_instructions: null,
    check_out_instructions: null,
    house_rules: null,
    emergency_contact: null,
    require_online_checkin: true,
    show_services: true,
    show_boutique: true,
    boutique_welcome_text: null,
    show_messaging: true,
    message_contact_role: 'house_manager',
  }
}

export async function fetchGuestPortalSettings(propertyId: string) {
  const { data, error } = await supabase
    .from('property_guest_portal_settings')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle()

  if (error) return { data: defaultGuestPortalSettings(propertyId), error }
  return {
    data: data ? (data as GuestPortalSettings) : defaultGuestPortalSettings(propertyId),
    error: null,
  }
}

export async function saveGuestPortalSettings(settings: GuestPortalSettings) {
  const payload = {
    property_id: settings.property_id,
    enabled: settings.enabled,
    welcome_title: settings.welcome_title?.trim() || null,
    welcome_message: settings.welcome_message?.trim() || null,
    wifi_name: settings.wifi_name?.trim() || null,
    wifi_password: settings.wifi_password?.trim() || null,
    check_in_instructions: normalizeRichContentForSave(settings.check_in_instructions),
    check_out_instructions: normalizeRichContentForSave(settings.check_out_instructions),
    house_rules: normalizeRichContentForSave(settings.house_rules),
    emergency_contact: normalizeEmergencyContactsForSave(settings.emergency_contact),
    require_online_checkin: settings.require_online_checkin,
    show_services: settings.show_services,
    show_boutique: settings.show_boutique ?? true,
    boutique_welcome_text: settings.boutique_welcome_text?.trim() || null,
    show_messaging: settings.show_messaging ?? true,
    message_contact_role: settings.message_contact_role ?? 'house_manager',
    updated_at: new Date().toISOString(),
  }

  return supabase
    .from('property_guest_portal_settings')
    .upsert(payload, { onConflict: 'property_id' })
    .select('*')
    .single()
}

export async function fetchPropertyGuides(propertyId: string) {
  return supabase
    .from('guides')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
}

export async function saveGuestGuide(guide: {
  id?: string
  property_id: string
  title: string
  category: GuestGuideCategory | string
  content: string
  icon?: string | null
  published: boolean
  sort_order: number
}) {
  const payload = {
    property_id: guide.property_id,
    title: guide.title.trim(),
    category: guide.category,
    content: guide.content.trim(),
    icon: guide.icon?.trim() || null,
    published: guide.published,
    sort_order: guide.sort_order,
    updated_at: new Date().toISOString(),
  }

  if (guide.id) {
    return supabase
      .from('guides')
      .update(payload)
      .eq('id', guide.id)
      .select('*')
      .single()
  }

  return supabase
    .from('guides')
    .insert(payload)
    .select('*')
    .single()
}

export async function deleteGuestGuide(guideId: string) {
  return supabase.from('guides').delete().eq('id', guideId)
}

export function countPublishedGuides(guides: GuestGuide[]) {
  return guides.filter(guide => guide.published).length
}
