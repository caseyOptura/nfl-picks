// Web Push on this device: permission, subscription, and its push_subscriptions
// row. Module-level so the settings card and the chat nudge agree.

const permission = ref<NotificationPermission>('default')
const isSubscribed = ref(false)
const busy = ref(false)

function keyBytes(base64url: string) {
  const b64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0))
}

export function usePushNotifications() {
  const client = useSupabaseClient()
  const vapidKey = useRuntimeConfig().public.vapidPublicKey as string

  const isSupported = import.meta.client
    && !!vapidKey
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window

  // iOS only offers Web Push to sites added to the Home Screen (16.4+).
  const isIos = import.meta.client
    && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
  const isStandalone = import.meta.client
    && ((navigator as Navigator & { standalone?: boolean }).standalone === true
      || window.matchMedia('(display-mode: standalone)').matches)
  const needsIosInstall = isIos && !isStandalone

  async function currentSubscription() {
    if (!isSupported) return null
    // getRegistration, not .ready: .ready never settles if registration failed.
    const reg = await navigator.serviceWorker.getRegistration()
    return reg ? reg.pushManager.getSubscription() : null
  }

  async function save(sub: PushSubscription) {
    const json = sub.toJSON()
    const { error } = await client.rpc('save_push_subscription' as never, {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys?.p256dh,
      p_auth: json.keys?.auth,
      p_user_agent: navigator.userAgent.slice(0, 300),
    } as never)
    return error
  }

  // Read the browser's state; if this device is subscribed, make sure its row
  // belongs to whoever is signed in now.
  async function refresh() {
    if (!isSupported) return
    permission.value = Notification.permission
    const sub = await currentSubscription()
    isSubscribed.value = !!sub && permission.value === 'granted'
    if (sub && isSubscribed.value) await save(sub)
  }

  // Must run from a click: browsers (and iOS always) require a user gesture.
  async function enable(): Promise<string | null> {
    if (!isSupported) return 'This browser doesn’t support notifications.'
    busy.value = true
    try {
      permission.value = await Notification.requestPermission()
      if (permission.value !== 'granted') {
        return permission.value === 'denied'
          ? 'Notifications are blocked. Allow them for this site in your browser settings.'
          : null
      }
      const reg = await navigator.serviceWorker.ready
      const sub = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) }))
      if (await save(sub)) return 'Couldn’t turn on notifications. Try again.'
      isSubscribed.value = true
      return null
    } catch (e) {
      console.warn('[push] enable failed', e)
      return 'Couldn’t turn on notifications. Try again.'
    } finally {
      busy.value = false
    }
  }

  async function disable(): Promise<string | null> {
    busy.value = true
    try {
      const sub = await currentSubscription()
      if (sub) {
        await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      isSubscribed.value = false
      return null
    } catch (e) {
      console.warn('[push] disable failed', e)
      return 'Couldn’t turn off notifications. Try again.'
    } finally {
      busy.value = false
    }
  }

  // Called before sign-out so the next person on this browser doesn't get
  // this user's pushes. Keeps the browser subscription for a later sign-in.
  async function forgetDevice() {
    const sub = await currentSubscription().catch(() => null)
    if (sub) await client.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    isSubscribed.value = false
  }

  return {
    isSupported, needsIosInstall, permission, isSubscribed, busy,
    refresh, enable, disable, forgetDevice,
  }
}
