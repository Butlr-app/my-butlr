import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { MobileLayout } from '@/components/mobile/MobileLayout'
import { useRole } from '@/lib/roleContext'
import { useOnlineStatus, flushQueue, getQueue } from '@/lib/offline'
import { useToast } from '@/components/ui/Toast'
import { Loader2, CalendarCheck, ClipboardList, AlertTriangle, User, WifiOff } from 'lucide-react'
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
  const online = useOnlineStatus()
  const { toast } = useToast()

  useEffect(() => {
    if (!online || getQueue().length === 0) return
    flushQueue().then(synced => {
      if (synced > 0) toast(`Back online — ${synced} change${synced > 1 ? 's' : ''} synced`)
    })
  }, [online, toast])

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

  return (
    <>
      {!online && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-1.5 bg-gray-900 text-white text-[11px] font-semibold py-1.5">
          <WifiOff className="w-3.5 h-3.5" />
          Offline — changes will sync when back online
        </div>
      )}
      <MobileLayout navItems={hmNavItems} variant="light" />
    </>
  )
}
