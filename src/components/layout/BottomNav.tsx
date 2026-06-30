import { cn } from '@/lib/utils'
import { NavLink } from 'react-router-dom'
import { useRoleFilter } from '@/lib/useRoleFilter'
import { useTranslation } from '@/i18n/LanguageContext'
import { LayoutDashboard, CalendarDays, Calendar, MessageSquare, Menu } from 'lucide-react'

const primaryItems = [
  { to: '/app', icon: LayoutDashboard, labelKey: 'nav.overview', page: 'dashboard', end: true },
  { to: '/app/reservations', icon: CalendarDays, labelKey: 'nav.reservations', page: 'reservations' },
  { to: '/app/calendar', icon: Calendar, labelKey: 'nav.calendar', page: 'calendar' },
  { to: '/app/messages', icon: MessageSquare, labelKey: 'nav.messages', page: 'messages' },
]

interface BottomNavProps {
  onMenuClick: () => void
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const { isVisible } = useRoleFilter()
  const { t } = useTranslation()

  const items = primaryItems.filter(item => isVisible(item.page)).slice(0, 4)

  return (
    <nav className="fixed bottom-0 inset-x-0 h-16 bg-card/95 backdrop-blur-sm border-t border-border flex items-stretch z-30 lg:hidden pb-[env(safe-area-inset-bottom)]">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => cn(
            'flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors',
            isActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <item.icon className="w-5 h-5" />
          <span className="truncate max-w-full px-1">{t(item.labelKey)}</span>
        </NavLink>
      ))}
      <button
        onClick={onMenuClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground"
      >
        <Menu className="w-5 h-5" />
        <span>{t('nav.menu')}</span>
      </button>
    </nav>
  )
}
