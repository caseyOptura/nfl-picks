// Registers the push-only service worker (public/sw.js). It has no fetch
// handler, so it never affects page loads. On sign-in, re-links this device's
// push subscription (if any) to the signed-in user.
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service worker registration failed', e))

  const { userId } = useAuth()
  const push = usePushNotifications()
  watch(userId, (id) => {
    if (id) push.refresh()
  }, { immediate: true })
})
