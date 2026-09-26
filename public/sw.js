// Push-only service worker: no offline caching, no fetch handler.
// Payload comes from supabase/functions/chat-push: { title, body, icon, tag, url }.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let data = {}
    try {
      data = event.data ? event.data.json() : {}
    } catch {
      data = { body: event.data && event.data.text() }
    }
    const url = new URL(data.url || '/leagues', self.location.origin)

    // Backup to the server's "recently seen" check: skip if that chat is
    // already open and focused.
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    if (windows.some((c) => c.focused && new URL(c.url).pathname === url.pathname)) return

    await self.registration.showNotification(data.title || 'NFL Picks', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag,
      renotify: !!data.tag,
      data: { url: url.href },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.location.origin + '/leagues'
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const same = windows.find((c) => c.url === url)
    if (same) return same.focus()
    const any = windows[0]
    if (any) {
      await any.focus()
      return any.navigate(url)
    }
    return self.clients.openWindow(url)
  })())
})
