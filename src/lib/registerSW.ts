// Registers the service worker that powers offline support and push notifications.
// Registration is skipped during development (and when the API is unavailable)
// so the Vite HMR dev server is never intercepted by a cached shell.
export function registerServiceWorker() {
  if (import.meta.env.DEV) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err)
    })
  })
}
