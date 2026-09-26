// Web Push delivery for chat-push: VAPID setup and sending to a user's devices.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'

export interface PushPayload {
  title: string
  body: string
  icon: string
  tag: string
  url: string
}

const b64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const toB64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// The library wants JWKs; build them from the usual raw base64url pair.
function vapidJwks(publicKey: string, privateKey: string): webpush.ExportedVapidKeys {
  const raw = b64url(publicKey) // 0x04 || x || y
  const base = { kty: 'EC', crv: 'P-256', x: toB64url(raw.slice(1, 33)), y: toB64url(raw.slice(33, 65)) }
  return { publicKey: base, privateKey: { ...base, d: privateKey } }
}

let appServer: Promise<webpush.ApplicationServer> | null = null
function getAppServer() {
  appServer ??= (async () => {
    const vapidKeys = await webpush.importVapidKeys(
      vapidJwks(Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!),
    )
    return webpush.ApplicationServer.new({ contactInformation: Deno.env.get('VAPID_SUBJECT')!, vapidKeys })
  })()
  return appServer
}

export async function send(db: SupabaseClient, userIds: string[], payload: PushPayload) {
  if (!userIds.length) return 0
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', userIds)
  if (!subs?.length) return 0
  const server = await getAppServer()
  const message = JSON.stringify(payload)
  let sent = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await server.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
        .pushTextMessage(message, { ttl: 3600, urgency: webpush.Urgency.Normal })
      sent++
      await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', s.id)
    } catch (e) {
      // 404/410: the browser discarded this subscription.
      if (e instanceof webpush.PushMessageError && (e.isGone() || e.response.status === 404)) {
        await db.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        console.error('push failed', s.id, String(e))
      }
    }
  }))
  return sent
}
