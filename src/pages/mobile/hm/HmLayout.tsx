import { useEffect, useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { MobileLayout } from '@/components/mobile/MobileLayout'
import { useTranslation } from '@/i18n/LanguageContext'
import { useRole } from '@/lib/roleContext'
import { useOnlineStatus, flushQueue, getQueue } from '@/lib/offline'
import { useToast } from '@/components/ui/Toast'
import { Loader2, CalendarCheck, ClipboardList, AlertTriangle, User, WifiOff } from 'lucide-react'
import type { NavItem } from '@/components/mobile/BottomNav'

const ALLOWED_ROLES = ['owner', 'agency', 'house_manager', 'concierge']

export function HmLayout() {
  const { role, roleLoading } = useRole()
  const online = useOnlineStatus()
  const { toast } = useToast()
  const { t } = useTranslation()

  const hmNavItems: NavItem[] = useMemo(() => [
    { path: '/hm', label: t('hm.nav.today'), icon: CalendarCheck },
    { path: '/hm/tasks', label: t('hm.nav.tasks'), icon: ClipboardList },
    { path: '/hm/incidents', label: t('hm.nav.incidents'), icon: AlertTriangle },
    { path: '/hm/profile', label: t('hm.nav.profile'), icon: User },
  ], [t])

  useEffect(() => {
    if (!online || getQueue().length === 0) return
    flushQueue().then(synced => {
      if (synced > 0) toast(`${t('hm.backOnline')} — ${synced} ${t('hm.changesSynced')}`)
    })
  }, [online, toast, t])

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
          {t('hm.offlineBanner')}
        </div>
      )}
      <MobileLayout navItems={hmNavItems} variant="light" />
    </>
  )
}
