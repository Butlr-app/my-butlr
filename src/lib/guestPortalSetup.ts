import { hasEmergencyContacts } from './emergencyContacts'
import { hasRichContent } from './guideContent'
import type { GuestGuide, GuestPortalSettings } from './guestPortal'

export type GuestPortalSectionId = 'activation' | 'welcome' | 'stay' | 'rules' | 'guides'

export type GuestPortalSectionStatus = 'complete' | 'partial' | 'empty'

export function assessGuestPortalSection(
  sectionId: GuestPortalSectionId,
  settings: GuestPortalSettings,
  guides: GuestGuide[],
): GuestPortalSectionStatus {
  switch (sectionId) {
    case 'activation': {
      if (!settings.enabled) return 'partial'
      const modules = [
        settings.show_services,
        settings.show_boutique ?? true,
        settings.show_messaging ?? true,
      ].filter(Boolean).length
      return modules > 0 ? 'complete' : 'partial'
    }
    case 'welcome': {
      const hasWelcome = Boolean(
        settings.welcome_message?.trim()
        || (settings.welcome_title?.trim() && settings.welcome_title !== 'Bienvenue'),
      )
      const hasWifi = Boolean(settings.wifi_name?.trim() && settings.wifi_password?.trim())
      if (hasWelcome && hasWifi) return 'complete'
      if (hasWelcome || hasWifi || settings.wifi_name?.trim()) return 'partial'
      return 'empty'
    }
    case 'stay': {
      const hasCheckIn = hasRichContent(settings.check_in_instructions)
      const hasCheckOut = hasRichContent(settings.check_out_instructions)
      if (hasCheckIn && hasCheckOut) return 'complete'
      if (hasCheckIn || hasCheckOut) return 'partial'
      return 'empty'
    }
    case 'rules': {
      const hasRules = hasRichContent(settings.house_rules)
      const hasEmergency = hasEmergencyContacts(settings.emergency_contact)
      if (hasRules && hasEmergency) return 'complete'
      if (hasRules || hasEmergency) return 'partial'
      return 'empty'
    }
    case 'guides': {
      const published = guides.filter(guide => guide.published).length
      if (published > 0) return 'complete'
      if (guides.length > 0) return 'partial'
      return 'empty'
    }
  }
}

export function countGuestPortalSectionsByStatus(
  settings: GuestPortalSettings,
  guides: GuestGuide[],
  status: GuestPortalSectionStatus,
): number {
  const sections: GuestPortalSectionId[] = ['activation', 'welcome', 'stay', 'rules', 'guides']
  return sections.filter(id => assessGuestPortalSection(id, settings, guides) === status).length
}

export function guestPortalSetupProgress(
  settings: GuestPortalSettings,
  guides: GuestGuide[],
): { complete: number; partial: number; empty: number; total: number; percent: number } {
  const sections: GuestPortalSectionId[] = ['activation', 'welcome', 'stay', 'rules', 'guides']
  const complete = countGuestPortalSectionsByStatus(settings, guides, 'complete')
  const partial = countGuestPortalSectionsByStatus(settings, guides, 'partial')
  const empty = countGuestPortalSectionsByStatus(settings, guides, 'empty')
  const total = sections.length
  const percent = Math.round(((complete + partial * 0.5) / total) * 100)
  return { complete, partial, empty, total, percent }
}
