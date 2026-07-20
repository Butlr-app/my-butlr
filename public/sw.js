/* My Butlr service worker — offline support + push notifications */
const VERSION = 'butlr-v2'
const APP_SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`
const OFFLINE_URL = '/offline.html'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

function isStaticAsset(url) {
  return /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|svg|webp|gif|ico)$/.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Only handle same-origin requests; let API/Supabase calls hit the network directly.
  if (url.origin !== self.location.origin) return

  // App navigations: network-first, fall back to cached shell, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const root = await caches.match('/')
          if (root) return root
          const shell = await caches.match('/index.html')
          if (shell) return shell
          return caches.match(OFFLINE_URL)
        })
    )
    return
  }

  // Static assets: stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) cache.put(request, response.clone())
            return response
          })
          .catch(() => cached ?? new Response('Offline', { status: 408, statusText: 'Offline' }))
        return cached || network
      })
    )
  }
})

/* ── Push notifications ─────────────────────────────────────────────────────
 * Receives Web Push events from a push server (VAPID). The client-side opt-in
 * also dispatches local notifications via registration.showNotification(). */
self.addEventListener('push', (event) => {
  let payload = { title: 'My Butlr', body: 'You have a new notification', url: '/app/notifications' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    if (event.data) payload.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag || 'butlr-notification',
      data: { url: payload.url || '/app/notifications' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/app/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    })
  )
})
