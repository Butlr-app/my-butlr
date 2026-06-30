import { MobileLayout } from '@/components/mobile/MobileLayout'
import { Search, Calendar, Sparkles, MessageSquare, User } from 'lucide-react'
import type { NavItem } from '@/components/mobile/BottomNav'

const guestNavItems: NavItem[] = [
  { path: '/guest', label: 'Explore', icon: Search },
  { path: '/guest/stays', label: 'Stays', icon: Calendar },
  { path: '/guest/services', label: 'Services', icon: Sparkles },
  { path: '/guest/messages', label: 'Messages', icon: MessageSquare },
  { path: '/guest/profile', label: 'Profile', icon: User },
]

export function GuestLayout() {
  return <MobileLayout navItems={guestNavItems} />
}
