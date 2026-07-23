import type { GuestGuideCategory } from '@/lib/guestPortal'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Car,
  Compass,
  ConciergeBell,
  KeyRound,
  MapPin,
  ScrollText,
  ShieldAlert,
  Waves,
  Wifi,
} from 'lucide-react'

export const guestPortalCategoryIcons: Record<string, LucideIcon> = {
  general: BookOpen,
  access: KeyRound,
  keys_access: KeyRound,
  wifi: Wifi,
  wifi_tech: Wifi,
  house_rules: ScrollText,
  local: MapPin,
  outdoor: MapPin,
  pool: Waves,
  spa: Waves,
  parking: Car,
  emergency: ShieldAlert,
  services: ConciergeBell,
  other: Compass,
}

export function guestPortalCategoryIcon(category: GuestGuideCategory | string): LucideIcon {
  return guestPortalCategoryIcons[category] ?? Compass
}

/** Scoped luxury palette for the guest-facing portal */
export const guestPortalTheme = {
  shell: 'bg-[#FAF8F5] text-[#1A1614] font-sans',
  serif: "font-['Cormorant_Garamond',Georgia,serif]",
  heroOverlay: 'bg-gradient-to-t from-[#1A1614]/90 via-[#1A1614]/35 to-transparent',
  card: 'rounded-[1.25rem] bg-white shadow-[0_4px_24px_rgba(26,22,20,0.06)] ring-1 ring-[#1A1614]/[0.04]',
  cardMuted: 'rounded-[1.25rem] bg-[#F3EFEA] ring-1 ring-[#1A1614]/[0.05]',
  accent: 'text-[#9A7B4F]',
  accentBg: 'bg-[#9A7B4F]',
  accentSoft: 'bg-[#F5EDE3] text-[#7A6040]',
  label: 'text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9A7B4F]',
  body: 'text-[15px] leading-relaxed text-[#5C534C]',
  title: 'text-[#1A1614]',
  navActive: 'text-[#9A7B4F]',
  navIdle: 'text-[#A89F96]',
} as const
