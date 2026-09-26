import type { MemberView } from '~/types/picks'
import type { ChatMessageRow, ChatMessageView, LocalChatMessage, MessageCreatedEvent } from '~/types/chat'

const PAGE_SIZE = 40
const GAP_FILL_LIMIT = 200
const EDIT_WINDOW_MS = 15 * 60 * 1000

function fromRow(r: ChatMessageRow): LocalChatMessage {
  return {
    id: r.id,
    clientId: r.client_id,
    kind: r.kind,
    userId: r.user_id,
    body: r.body,
    createdAt: r.created_at,
    editedAt: r.edited_at,
    deletedAt: r.deleted_at,
    deletedBy: r.deleted_by,
    replyToId: r.reply_to_id,
    status: 'sent',
  }
}

function fromEvent(e: MessageCreatedEvent): LocalChatMessage {
  return {
    id: e.id,
    clientId: e.clientId,
    kind: e.kind,
    userId: e.userId,
    body: e.body,
    createdAt: e.createdAt,
    editedAt: null,
    deletedAt: null,
    deletedBy: null,
    replyToId: e.replyToId,
    status: 'sent',
  }
}

// History, pagination, sending, and live updates for one league's chat.
// `members` comes from useLeague so names/avatars always reflect current profiles.
export function useLeagueChat(leagueId: MaybeRefOrGetter<string>, members: Ref<MemberView[]>, isOwner: Ref<boolean>) {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const hub = useChatRealtime()
  const visibility = useDocumentVisibility()
  const reactions = useChatReactions(leagueId)

  const local = ref<LocalChatMessage[]>([])
  const hasMore = ref(true)
  const loading = ref(false)
  const loadingOlder = ref(false)
  const error = ref<string | null>(null)

  const memberMap = computed(() => new Map(members.value.map((m) => [m.userId, m])))

  const messages = computed<ChatMessageView[]>(() => {
    const me = userId.value
    const now = Date.now()
    return local.value.map((m) => {
      const member = m.userId ? memberMap.value.get(m.userId) : undefined
      const mine = !!me && m.userId === me
      return {
        ...m,
        displayName: m.kind === 'system' ? 'Picks Bot' : member?.displayName ?? 'Former member',
        avatarUrl: member?.avatarUrl ?? null,
        mine,
        mentionsMe: !!me && !mine && m.body.includes(`](${me})`),
        canEdit: mine && m.kind === 'user' && !m.deletedAt && now - Date.parse(m.createdAt) < EDIT_WINDOW_MS,
        canDelete: !m.deletedAt && m.id !== null && (mine || isOwner.value),
        reactions: reactions.summaries(m.id),
      }
    })
  })

  const newestId = () => {
    for (let i = local.value.length - 1; i >= 0; i--) {
      const id = local.value[i]!.id
      if (id !== null) return id
    }
    return 0
  }
  const oldestId = () => local.value.find((m) => m.id !== null)?.id ?? null

  // Insert or replace by id / clientId, keeping ascending id order (pending last).
  function upsert(incoming: LocalChatMessage[]) {
    if (!incoming.length) return
    const list = [...local.value]
    for (const msg of incoming) {
      const idx = list.findIndex((m) => (msg.id !== null && m.id === msg.id) || m.clientId === msg.clientId)
      if (idx >= 0) list[idx] = { ...list[idx]!, ...msg }
      else list.push(msg)
    }
    list.sort((a, b) => (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER))
    local.value = list
  }

  function query() {
    return client.from('chat_messages').select('*').eq('league_id', toValue(leagueId))
  }

  async function loadLatest() {
    loading.value = true
    error.value = null
    const { data, error: e } = await query().order('id', { ascending: false }).limit(PAGE_SIZE)
    if (e) {
      loading.value = false
      error.value = e.message
      return
    }
    const rows = (data as ChatMessageRow[]).reverse()
    // Load reactions first so chips don't pop in (and shift the list) after render.
    await reactions.load(rows.map((r) => r.id))
    loading.value = false
    hasMore.value = rows.length === PAGE_SIZE
    local.value = [...rows.map(fromRow), ...local.value.filter((m) => m.status !== 'sent')]
  }

  async function loadOlder() {
    const before = oldestId()
    if (loadingOlder.value || !hasMore.value || before === null) return
    loadingOlder.value = true
    const { data, error: e } = await query().lt('id', before).order('id', { ascending: false }).limit(PAGE_SIZE)
    if (e) {
      loadingOlder.value = false
      error.value = e.message
      return
    }
    const rows = data as ChatMessageRow[]
    await reactions.load(rows.map((r) => r.id))
    loadingOlder.value = false
    hasMore.value = rows.length === PAGE_SIZE
    upsert(rows.map(fromRow))
  }

  // Broadcast doesn't replay, so after a reconnect or wake-up fetch anything we missed.
  async function fillGap() {
    const after = newestId()
    if (!after) return loadLatest()
    const { data, error: e } = await query().gt('id', after).order('id', { ascending: true }).limit(GAP_FILL_LIMIT)
    if (e) return
    const rows = data as ChatMessageRow[]
    if (rows.length === GAP_FILL_LIMIT) return loadLatest()
    upsert(rows.map(fromRow))
    // Reactions on messages we already had may have changed while we were away.
    reactions.load(local.value.flatMap((m) => (m.id === null ? [] : [m.id])))
  }

  async function insert(msg: LocalChatMessage) {
    const { data, error: e } = await client
      .from('chat_messages')
      .insert({
        league_id: toValue(leagueId),
        user_id: userId.value,
        body: msg.body,
        client_id: msg.clientId,
        reply_to_id: msg.replyToId,
      } as never)
      .select('*')
      .single()
    if (e) {
      upsert([{ ...msg, status: 'failed' }])
      return e.message.includes('RATE_LIMITED') ? 'Slow down a sec — too many messages at once.' : 'Message failed to send.'
    }
    upsert([fromRow(data as ChatMessageRow)])
    return null
  }

  async function send(body: string, replyToId: number | null = null): Promise<string | null> {
    const text = body.trim()
    if (!text || !userId.value) return null
    if (text.length > 2000) return 'Messages are limited to 2,000 characters.'
    const msg: LocalChatMessage = {
      id: null,
      clientId: crypto.randomUUID(),
      kind: 'user',
      userId: userId.value,
      body: text,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      deletedBy: null,
      replyToId,
      status: 'pending',
    }
    upsert([msg])
    return insert(msg)
  }

  async function retry(clientId: string) {
    const msg = local.value.find((m) => m.clientId === clientId && m.status === 'failed')
    if (!msg) return null
    upsert([{ ...msg, status: 'pending' }])
    return insert(msg)
  }

  function discard(clientId: string) {
    local.value = local.value.filter((m) => !(m.clientId === clientId && m.status === 'failed'))
  }

  // Remember how far this user has read, for unread badges.
  const markRead = useDebounceFn(async () => {
    const last = newestId()
    if (!last || !userId.value || visibility.value !== 'visible') return
    await client.from('chat_read_state').upsert({
      league_id: toValue(leagueId),
      user_id: userId.value,
      last_read_message_id: last,
    } as never)
  }, 1000)

  const isThisLeague = (id: string) => id === toValue(leagueId)

  hub.onScoped('message_created', (e) => {
    if (isThisLeague(e.leagueId)) upsert([fromEvent(e)])
  })
  hub.onScoped('message_updated', (e) => {
    if (!isThisLeague(e.leagueId)) return
    const m = local.value.find((x) => x.id === e.id)
    if (m) upsert([{ ...m, body: e.body, editedAt: e.editedAt }])
  })
  hub.onScoped('message_deleted', (e) => {
    if (!isThisLeague(e.leagueId)) return
    const m = local.value.find((x) => x.id === e.id)
    if (m) upsert([{ ...m, deletedAt: e.deletedAt, deletedBy: e.deletedBy }])
  })
  hub.onScoped('reconnected', (e) => {
    if (isThisLeague(e.leagueId)) fillGap()
  })

  watch(visibility, (v) => {
    if (v === 'visible') {
      fillGap()
      markRead()
    }
  })
  watch(() => newestId(), () => markRead())
  watch(() => toValue(leagueId), () => {
    local.value = []
    reactions.reset()
    hasMore.value = true
    loadLatest()
  }, { immediate: true })

  return {
    messages, hasMore, loading, loadingOlder, error,
    loadOlder, send, retry, discard, reload: loadLatest, toggleReaction: reactions.toggle,
  }
}
