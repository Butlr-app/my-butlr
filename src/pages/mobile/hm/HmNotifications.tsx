import { useNotifications } from '@/lib/useSupabase'
import { useTranslation } from '@/i18n/LanguageContext'
import { Loader2, Bell, CheckCheck } from 'lucide-react'

export function HmNotifications() {
  const { notifications, loading, unreadCount, markAsRead, markAllRead } = useNotifications()
  const { t, language } = useTranslation()
  const locale = language === 'fr' ? 'fr-FR' : 'en-GB'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('hm.nav.alerts')}</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 active:text-amber-700"
          >
            <CheckCheck className="w-4 h-4" />
            {t('hm.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="px-5 mt-10 flex flex-col items-center text-center text-gray-400">
          <Bell className="w-10 h-10 mb-3" />
          <p className="text-sm">{t('hm.noNotifications')}</p>
        </div>
      ) : (
        <div className="px-5 space-y-2.5 pb-8">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => { if (!n.read) markAsRead(n.id) }}
              className={`w-full text-left flex gap-3 p-4 rounded-2xl border shadow-sm transition-colors ${
                n.read ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                n.read ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600'
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
                </div>
                {n.message && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>}
                <p className="text-[11px] text-gray-400 mt-1">{fmt(n.created_at)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
