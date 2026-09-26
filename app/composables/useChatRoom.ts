import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MemberView } from '~/types/picks'

const TYPING_THROTTLE_MS = 2500
const TYPING_IDLE_MS = 4000
const TYPING_EXPIRY_MS = 5000
const HEARTBEAT_MS = 30_000

interface TypingPayload {
  userId: string
  state: 'start' | 'stop'
}

// Presence, typing, and the "actively viewing" heartbeat for one league's chat.
// Joins league:{id}:room only while the chat page is mounted, so keystroke
// traffic never reaches people who aren't looking.
export function useChatRoom(leagueId: string, members: Ref<MemberView[]>) {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const visibility = useDocumentVisibility()

  const viewerIds = ref<string[]>([])
  // userId → expiry timestamp. A closed tab never sends 'stop', so entries expire.
  const typingUntil = ref(new Map<string, number>())
  // Drop expired typers once a second (only matters while someone is typing).
  useIntervalFn(() => {
    if (!typingUntil.value.size) return
    const t = Date.now()
    const live = [...typingUntil.value].filter(([, until]) => until > t)
    if (live.length !== typingUntil.value.size) typingUntil.value = new Map(live)
  }, 1000)

  let channel: RealtimeChannel | null = null
  let subscribed = false
  let disposed = false

  const memberMap = computed(() => new Map(members.value.map((m) => [m.userId, m])))

  // Names and avatars always come from the members list, never from a payload.
  const viewers = computed(() =>
    viewerIds.value.flatMap((id) => {
      const m = memberMap.value.get(id)
      return m ? [m] : []
    }),
  )

  const typers = computed(() =>
    [...typingUntil.value.keys()].flatMap((id) => {
      const m = id !== userId.value ? memberMap.value.get(id) : undefined
      return m ? [m] : []
    }),
  )

  function markTyping({ userId: id, state }: TypingPayload) {
    if (!id || id === userId.value || !memberMap.value.has(id)) return
    const next = new Map(typingUntil.value)
    if (state === 'start') next.set(id, Date.now() + TYPING_EXPIRY_MS)
    else next.delete(id)
    typingUntil.value = next
  }

  function broadcast(state: TypingPayload['state']) {
    if (!channel || !subscribed || !userId.value) return
    channel.send({ type: 'broadcast', event: 'typing', payload: { userId: userId.value, state } })
  }

  // Leading-edge throttle by hand: useThrottleFn's trailing call would fire a
  // stray 'start' after 'stop', leaving us "typing" for 5s after sending.
  let lastStart = 0
  const idle = useTimeoutFn(() => stopTyping(), TYPING_IDLE_MS, { immediate: false })

  // Composer input: announce, and schedule a stop if the user goes quiet.
  function onTyping() {
    if (Date.now() - lastStart >= TYPING_THROTTLE_MS) {
      lastStart = Date.now()
      broadcast('start')
    }
    idle.start()
  }

  // Send, blur, or idle.
  function stopTyping() {
    idle.stop()
    if (!lastStart) return
    lastStart = 0
    broadcast('stop')
  }

  function heartbeat() {
    if (!userId.value) return
    client.from('chat_read_state').upsert({
      league_id: leagueId,
      user_id: userId.value,
      last_seen_at: new Date().toISOString(),
    } as never).then(({ error }) => {
      if (error) console.warn('[chat] heartbeat failed', error.message)
    })
  }

  const beat = useIntervalFn(heartbeat, HEARTBEAT_MS, { immediate: false })
  watch(visibility, (v) => {
    if (v === 'visible') {
      heartbeat()
      beat.resume()
    } else {
      beat.pause()
    }
  })

  function join(me: string) {
    channel = client.channel(`league:${leagueId}:room`, {
      config: { private: true, presence: { key: me } },
    })
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => markTyping(payload as TypingPayload))
      .on('presence', { event: 'sync' }, () => {
        viewerIds.value = Object.keys(channel?.presenceState() ?? {})
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          subscribed = true
          channel?.track({ userId: me, onlineAt: new Date().toISOString() })
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[chat] room channel error', err)
        }
      })
  }

  async function leave() {
    disposed = true
    stopTyping()
    beat.pause()
    subscribed = false
    const c = channel
    channel = null
    viewerIds.value = []
    typingUntil.value = new Map()
    if (c) await client.removeChannel(c)
  }

  onMounted(async () => {
    if (!userId.value) return
    await client.realtime.setAuth()
    if (disposed) return // left the page while authorizing
    join(userId.value)
    if (visibility.value === 'visible') {
      heartbeat()
      beat.resume()
    }
  })
  onScopeDispose(leave)

  return { viewers, typers, onTyping, stopTyping }
}
