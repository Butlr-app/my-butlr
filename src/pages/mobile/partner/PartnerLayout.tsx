import { MobileLayout } from '@/components/mobile/MobileLayout'
import { LayoutDashboard, Calendar, DollarSign, Sparkles, User } from 'lucide-react'
import type { NavItem } from '@/components/mobile/BottomNav'

const partnerNavItems: NavItem[] = [
  { path: '/partner', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/partner/bookings', label: 'Bookings', icon: Calendar },
  { path: '/partner/earnings', label: 'Earnings', icon: DollarSign },
  { path: '/partner/services', label: 'Services', icon: Sparkles },
  { path: '/partner/profile', label: 'Profile', icon: User },
]

export function PartnerLayout() {
  return <MobileLayout navItems={partnerNavItems} />
}
