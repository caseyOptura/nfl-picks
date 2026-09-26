// chat-push: sends Web Push for new chat messages and reactions.
//
// Called by the chat_push_notify() trigger (migration 0006) via pg_net with
// { type, table, record } and an x-webhook-secret header. Deploy with JWT
// verification off; the shared secret is the auth.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   base64url pair from `npx web-push generate-vapid-keys`
//   VAPID_SUBJECT                         mailto: contact for push services
//   CHAT_WEBHOOK_SECRET                   same value as the Vault secret chat_webhook_secret
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { send } from './push.ts'

const SEEN_WINDOW_MS = 45_000 // chat open on screen → they already see it
const REACTION_SETTLE_MS = 3_000 // let a quick react-then-unreact cancel itself
const SNIPPET_MAX = 100

interface MessageRecord {
  id: number
  league_id: string
  kind: 'user' | 'system'
  user_id: string | null
  body: string
}

interface ReactionRecord {
  message_id: number
  user_id: string
  league_id: string
  emoji: string
}

interface Prefs { user_id: string, muted: boolean, push_messages: boolean, push_reactions: boolean }
interface Quiet { user_id: string, quiet_start: string | null, quiet_end: string | null, timezone: string }

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

// ── Helpers ────────────────────────────────────────────────────

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function snippet(body: string) {
  const text = body.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, '@$1').replace(/\s+/g, ' ').trim()
  return text.length > SNIPPET_MAX ? `${text.slice(0, SNIPPET_MAX - 1)}…` : text
}

async function displayName(userId: string) {
  const { data } = await db.from('profiles').select('nickname, first_name, last_name, avatar_url').eq('id', userId).maybeSingle()
  const full = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim()
  return { name: data?.nickname?.trim() || full || 'Member', avatarUrl: (data?.avatar_url as string | null) ?? null }
}

async function leagueName(leagueId: string) {
  const { data } = await db.from('leagues').select('name').eq('id', leagueId).maybeSingle()
  return (data?.name as string | undefined) ?? 'your league'
}

function inQuietHours(q: Quiet | undefined, now = new Date()) {
  if (!q?.quiet_start || !q.quiet_end) return false
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: q.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  const [start, end] = [q.quiet_start.slice(0, 5), q.quiet_end.slice(0, 5)]
  return start <= end ? hm >= start && hm < end : hm >= start || hm < end
}

// Per-user context for filtering recipients in one league.
async function recipientContext(leagueId: string, userIds: string[]) {
  const [prefs, quiet, seen] = await Promise.all([
    db.from('chat_notification_prefs').select('user_id, muted, push_messages, push_reactions').eq('league_id', leagueId).in('user_id', userIds),
    db.from('user_notification_settings').select('user_id, quiet_start, quiet_end, timezone').in('user_id', userIds),
    db.from('chat_read_state').select('user_id, last_seen_at').eq('league_id', leagueId).in('user_id', userIds)
      .gt('last_seen_at', new Date(Date.now() - SEEN_WINDOW_MS).toISOString()),
  ])
  const prefsBy = new Map((prefs.data as Prefs[] ?? []).map((p) => [p.user_id, p]))
  const quietBy = new Map((quiet.data as Quiet[] ?? []).map((q) => [q.user_id, q]))
  const viewing = new Set((seen.data ?? []).map((r) => r.user_id as string))
  return {
    prefs: (id: string): Prefs => prefsBy.get(id) ?? { user_id: id, muted: false, push_messages: true, push_reactions: true },
    blocked: (id: string) => viewing.has(id) || inQuietHours(quietBy.get(id)),
  }
}

// ── Handlers ───────────────────────────────────────────────────

async function onMessage(m: MessageRecord) {
  // Picks Bot pushes (lock reminders) arrive with PR 5.
  if (m.kind !== 'user' || !m.user_id) return 0

  const [{ data: members }, { data: mentions }] = await Promise.all([
    db.from('league_members').select('user_id').eq('league_id', m.league_id).neq('user_id', m.user_id),
    db.from('chat_mentions').select('user_id').eq('message_id', m.id),
  ])
  const ids = (members ?? []).map((r) => r.user_id as string)
  if (!ids.length) return 0
  const mentioned = new Set((mentions ?? []).map((r) => r.user_id as string))
  const ctx = await recipientContext(m.league_id, ids)

  // Mentions (and replies, which the insert trigger records as mentions)
  // get through mute and the per-league push toggle; quiet hours still apply.
  const recipients = ids.filter((id) => {
    if (ctx.blocked(id)) return false
    const p = ctx.prefs(id)
    return mentioned.has(id) || (!p.muted && p.push_messages)
  })
  if (!recipients.length) return 0

  const [sender, league] = await Promise.all([displayName(m.user_id), leagueName(m.league_id)])
  const base = { icon: sender.avatarUrl ?? '/icons/icon-192.png', tag: `chat-${m.league_id}`, url: `/leagues/${m.league_id}/chat` }
  const mentionIds = recipients.filter((id) => mentioned.has(id))
  const otherIds = recipients.filter((id) => !mentioned.has(id))
  const [a, b] = await Promise.all([
    send(db, mentionIds, { ...base, title: `${sender.name} mentioned you in ${league}`, body: snippet(m.body) }),
    send(db, otherIds, { ...base, title: `${sender.name} in ${league}`, body: snippet(m.body) }),
  ])
  return a + b
}

async function onReaction(r: ReactionRecord) {
  const { data: msg } = await db.from('chat_messages').select('user_id, body, deleted_at').eq('id', r.message_id).maybeSingle()
  const author = msg?.user_id as string | null | undefined
  if (!author || author === r.user_id || msg?.deleted_at) return 0

  await new Promise((res) => setTimeout(res, REACTION_SETTLE_MS))
  const { count } = await db.from('chat_reactions').select('*', { count: 'exact', head: true })
    .match({ message_id: r.message_id, user_id: r.user_id, emoji: r.emoji })
  if (!count) return 0

  const ctx = await recipientContext(r.league_id, [author])
  const p = ctx.prefs(author)
  if (ctx.blocked(author) || p.muted || !p.push_reactions) return 0

  const [reactor, league] = await Promise.all([displayName(r.user_id), leagueName(r.league_id)])
  return send(db, [author], {
    title: `${reactor.name} reacted ${r.emoji} in ${league}`,
    body: snippet(msg!.body as string),
    icon: reactor.avatarUrl ?? '/icons/icon-192.png',
    // One notification per message: repeat reactions replace it.
    tag: `react-${r.message_id}`,
    url: `/leagues/${r.league_id}/chat`,
  })
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CHAT_WEBHOOK_SECRET')
  if (req.method !== 'POST' || !secret || !safeEqual(req.headers.get('x-webhook-secret') ?? '', secret)) {
    return new Response('Unauthorized', { status: 401 })
  }
  const { type, table, record } = await req.json()
  if (type !== 'INSERT' || !record) return Response.json({ sent: 0 })

  const sent = table === 'chat_messages'
    ? await onMessage(record as MessageRecord)
    : table === 'chat_reactions'
      ? await onReaction(record as ReactionRecord)
      : 0
  return Response.json({ sent })
})
