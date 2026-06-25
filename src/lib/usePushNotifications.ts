import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const STORAGE_KEY = 'butlr-push-enabled'

type PermissionState = NotificationPermission | 'unsupported'

interface NotificationRow {
  id: string
  user_id: string | null
  title: string
  message: string | null
  type: string
}

function isSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Manages opt-in browser push notifications. Requests permission, persists the
 * user's choice, and surfaces an OS-level notification whenever a new row lands
 * in the `notifications` table (via Supabase Realtime). When a service worker is
 * controlling the page it uses registration.showNotification (required for true
 * push on mobile); otherwise it falls back to the Notification constructor.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>(
    isSupported() ? Notification.permission : 'unsupported'
  )
  const [enabled, setEnabled] = useState(
    () => isSupported() && localStorage.getItem(STORAGE_KEY) === 'true'
  )
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const show = useCallback(async (title: string, body: string, url: string) => {
    if (!isSupported() || Notification.permission !== 'granted') return
    const options: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'butlr-notification',
      data: { url },
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        await reg.showNotification(title, options)
        return
      }
    }
    new Notification(title, options)
  }, [])

  const enable = useCallback(async () => {
    if (!isSupported()) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    const ok = result === 'granted'
    setEnabled(ok)
    localStorage.setItem(STORAGE_KEY, String(ok))
    if (ok) await show('Notifications enabled', "You'll now receive alerts from My Butlr.", '/app/notifications')
    return ok
  }, [show])

  const disable = useCallback(() => {
    setEnabled(false)
    localStorage.setItem(STORAGE_KEY, 'false')
  }, [])

  useEffect(() => {
    if (!isSupported()) return
    const channel = supabase
      .channel(`push-notifications-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (!enabledRef.current || Notification.permission !== 'granted') return
        const row = payload.new as NotificationRow
        show(row.title, row.message ?? '', '/app/notifications')
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [show])

  return {
    supported: isSupported(),
    permission,
    enabled: enabled && permission === 'granted',
    enable,
    disable,
  }
}
