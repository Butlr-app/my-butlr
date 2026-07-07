// Web Push (PWA) subscription helpers for the House Manager app.
// The VAPID public key is safe to embed in the client; the matching private key
// lives only in the `send-push` Edge Function secrets.
import { supabase } from '@/lib/supabase'

export const VAPID_PUBLIC_KEY =
  'BOcJKw93INTEPj6HU0vkCJTq2V7HWfscNHAQDM-mMb73zpfJKRntfsR-ngPZEAeV84T3TkxC7FrJryOfKyFTErg'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return sub !== null
}

function extractKeys(sub: PushSubscription): { p256dh: string; auth: string } {
  const raw = sub.toJSON().keys ?? {}
  return { p256dh: raw.p256dh ?? '', auth: raw.auth ?? '' }
}

export async function enablePush(): Promise<void> {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this device')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission denied')

  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { p256dh, auth } = extractKeys(sub)
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}
