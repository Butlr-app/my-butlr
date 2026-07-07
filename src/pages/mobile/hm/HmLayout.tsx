import { Navigate } from 'react-router-dom'
import { MobileLayout } from '@/components/mobile/MobileLayout'
import { useRole } from '@/lib/roleContext'
import { Loader2, CalendarCheck, ClipboardList, AlertTriangle, User } from 'lucide-react'
import type { NavItem } from '@/components/mobile/BottomNav'

const hmNavItems: NavItem[] = [
  { path: '/hm', label: 'Today', icon: CalendarCheck },
  { path: '/hm/tasks', label: 'Tasks', icon: ClipboardList },
  { path: '/hm/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/hm/profile', label: 'Profile', icon: User },
]

const ALLOWED_ROLES = ['owner', 'agency', 'house_manager', 'concierge']

export function HmLayout() {
  const { role, roleLoading } = useRole()

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF8]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return <Navigate to="/app" replace />
  }

  return <MobileLayout navItems={hmNavItems} variant="light" />
}
