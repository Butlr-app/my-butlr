import { Search, Bell, Moon, Sun, User, LogOut, Menu, X, CheckCheck, Globe, MessageSquare } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole, type Role } from '@/lib/roleContext'
import { useAuth } from '@/lib/authContext'
import { useSearch } from '@/lib/searchContext'
import { useNotifications, useUnreadMessages, type Notification } from '@/lib/useSupabase'
import { useTranslation } from '@/i18n/LanguageContext'

interface TopbarProps {
  title: string
  onMenuClick?: () => void
}

const roles: { value: Role; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'house_manager', label: 'House Manager' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'agency', label: 'Agency' },
  { value: 'partner', label: 'Partner' },
  { value: 'guest', label: 'Guest' },
]

const typeIcons: Record<Notification['type'], string> = {
  reservation: 'R',
  task: 'T',
  payment: 'P',
  system: 'S',
  service_request: 'SR',
}

const typeColors: Record<Notification['type'], string> = {
  reservation: 'bg-info/10 text-info',
  task: 'bg-warning/10 text-warning',
  payment: 'bg-success/10 text-success',
  system: 'bg-muted text-muted-foreground',
  service_request: 'bg-info/10 text-info',
}

export function Topbar({ title, onMenuClick }: TopbarProps) {
  const [dark, setDark] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { role, setRole } = useRole()
  const { signOut, user } = useAuth()
  const { query, setQuery } = useSearch()
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications()
  const unreadMessages = useUnreadMessages(user?.id)
  const { language, setLanguage } = useTranslation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleTheme = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-3 sm:px-6 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-2 rounded-md hover:bg-muted transition-colors lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-lg font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="h-9 px-3 bg-muted border-0 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring hidden sm:block"
        >
          {roles.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>

        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) navigate(`/app/search?q=${encodeURIComponent(query)}`) }}
            className="h-9 pl-9 pr-4 bg-muted border-0 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          onClick={() => navigate('/app/messages')}
          className="p-2 rounded-md hover:bg-muted transition-colors relative"
          title="Messages"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-destructive text-white rounded-full flex items-center justify-center">
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </button>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 rounded-md hover:bg-muted transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-destructive text-white rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="p-0.5 rounded hover:bg-muted">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.read) markAsRead(n.id) }}
                      className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors flex gap-3 ${!n.read ? 'bg-muted/30' : ''}`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${typeColors[n.type]}`}>
                        {typeIcons[n.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.read ? 'font-medium' : ''}`}>{n.title}</p>
                        {n.message && <p className="text-xs text-muted-foreground truncate">{n.message}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && <span className="w-2 h-2 bg-info rounded-full shrink-0 mt-2" />}
                    </button>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <button
                  onClick={() => { setNotifOpen(false); navigate('/app/notifications') }}
                  className="w-full px-4 py-2.5 text-center text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border"
                >
                  View all notifications
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
          className="h-9 px-2.5 rounded-xl hover:bg-muted transition-colors flex items-center gap-1 text-xs font-semibold"
          title={language === 'fr' ? 'Switch to English' : 'Passer en Français'}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'fr' ? 'FR' : 'EN'}</span>
        </button>

        <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted transition-colors">
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hidden sm:flex" title={user?.email ?? ''}>
          <User className="w-4 h-4" />
        </button>

        <button onClick={handleSignOut} className="p-2 rounded-md hover:bg-muted transition-colors" title="Sign out">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
