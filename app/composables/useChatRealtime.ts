import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ChatHubEvents } from '~/types/chat'

// App-wide realtime hub for chat. Owns one private channel per league the user
// belongs to (league:{id}) plus their personal channel (user:{id}), and fans
// events out to whoever registered with on(). Pages never open these topics
// themselves, so there is exactly one subscription per topic per tab.
//
// Typing and presence are NOT here — they live on league:{id}:room, which only
// the chat page joins (useChatRoom).

type EventName = keyof ChatHubEvents
type Handler<E extends EventName> = (payload: ChatHubEvents[E]) => void

const HUB_EVENTS: EventName[] = [
  'message_created', 'message_updated', 'message_deleted', 'reaction_changed', 'member_removed',
]

const channels = new Map<string, RealtimeChannel>()
const handlers = new Map<EventName, Set<Handler<EventName>>>()
const leagueIds = ref<string[]>([])
let currentUserId: string | null = null
let syncing: Promise<void> | null = null

function emit<E extends EventName>(event: E, payload: ChatHubEvents[E]) {
  handlers.get(event)?.forEach((h) => {
    try {
      h(payload)
    } catch (e) {
      console.error(`[chat] ${event} handler failed`, e)
    }
  })
}

function subscribe(topic: string, events: EventName[], onRejoin?: () => void) {
  const client = useSupabaseClient()
  let joinedOnce = false
  const channel = client.channel(topic, { config: { private: true } })
  for (const event of events) {
    channel.on('broadcast', { event }, ({ payload }) => emit(event, payload as ChatHubEvents[typeof event]))
  }
  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      if (joinedOnce) onRejoin?.()
      joinedOnce = true
    } else if (status === 'CHANNEL_ERROR') {
      console.warn(`[chat] ${topic} channel error`, err)
    }
  })
  channels.set(topic, channel)
}

async function unsubscribe(topic: string) {
  const channel = channels.get(topic)
  if (!channel) return
  channels.delete(topic)
  await useSupabaseClient().removeChannel(channel)
}

async function fetchLeagueIds(userId: string): Promise<string[]> {
  const { data, error } = await useSupabaseClient()
    .from('league_members')
    .select('league_id')
    .eq('user_id', userId)
  if (error) {
    console.warn('[chat] could not load leagues', error.message)
    return leagueIds.value
  }
  return (data as { league_id: string }[]).map((r) => r.league_id)
}

async function doSync(userId: string | null) {
  const client = useSupabaseClient()

  if (userId !== currentUserId) {
    await Promise.all([...channels.keys()].map(unsubscribe))
    leagueIds.value = []
    currentUserId = userId
  }
  if (!userId) return

  await client.realtime.setAuth()
  const ids = await fetchLeagueIds(userId)
  leagueIds.value = ids

  const wanted = new Set(ids.map((id) => `league:${id}`))
  wanted.add(`user:${userId}`)

  await Promise.all([...channels.keys()].filter((t) => !wanted.has(t)).map(unsubscribe))

  for (const id of ids) {
    const topic = `league:${id}`
    if (!channels.has(topic)) subscribe(topic, HUB_EVENTS, () => emit('reconnected', { leagueId: id }))
  }
  const userTopic = `user:${userId}`
  if (!channels.has(userTopic)) subscribe(userTopic, ['reaction_received', 'member_removed'])
}

// Serialise syncs so rapid auth/visibility changes can't interleave.
function sync(userId: string | null): Promise<void> {
  const run = (syncing ?? Promise.resolve()).then(() => doSync(userId))
  syncing = run.catch((e) => console.error('[chat] sync failed', e))
  return syncing
}

export function useChatRealtime() {
  function on<E extends EventName>(event: E, handler: Handler<E>): () => void {
    let set = handlers.get(event)
    if (!set) handlers.set(event, (set = new Set()))
    set.add(handler as Handler<EventName>)
    return () => set!.delete(handler as Handler<EventName>)
  }

  // Registers for the lifetime of the calling component.
  function onScoped<E extends EventName>(event: E, handler: Handler<E>) {
    const off = on(event, handler)
    onScopeDispose(off)
  }

  // Call after joining or creating a league so its channel opens right away.
  function refresh() {
    return sync(currentUserId)
  }

  return { on, onScoped, refresh, sync, leagueIds: readonly(leagueIds) }
}
