import type { MemberView } from '~/types/picks'
import type { ChatMessageRow, ChatMessageView, LocalChatMessage, MessageCreatedEvent } from '~/types/chat'

const PAGE_SIZE = 40
const GAP_FILL_LIMIT = 200
const EDIT_WINDOW_MS = 15 * 60 * 1000
const JUMP_MAX_PAGES = 5

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
  const replies = useChatReplies(leagueId, local, (id) => memberMap.value.get(id)?.displayName)
  // Re-evaluates canEdit as messages age out of the edit window.
  const now = useNow({ scheduler: (cb) => useIntervalFn(cb, 30_000) })

  // Same rules as the insert trigger: explicit token, owner's @league, or a reply to me.
  function isMentioned(m: LocalChatMessage, me: string) {
    if (m.body.includes(`](${me})`) || replies.authorOf(m.replyToId) === me) return true
    return /(^|\s)@league\b/i.test(m.body) && memberMap.value.get(m.userId ?? '')?.role === 'owner'
  }

  const messages = computed<ChatMessageView[]>(() => {
    const me = userId.value
    return local.value.map((m) => {
      const member = m.userId ? memberMap.value.get(m.userId) : undefined
      const mine = !!me && m.userId === me
      const sent = m.id !== null && !m.deletedAt
      return {
        ...m,
        displayName: m.kind === 'system' ? 'Picks Bot' : member?.displayName ?? 'Former member',
        avatarUrl: member?.avatarUrl ?? null,
        mine,
        mentionsMe: !!me && !mine && m.kind === 'user' && !m.deletedAt && isMentioned(m, me),
        canEdit: sent && mine && m.kind === 'user' && now.value.getTime() - Date.parse(m.createdAt) < EDIT_WINDOW_MS,
        canDelete: sent && (mine || isOwner.value),
        reactions: reactions.summaries(m.id),
        replyTo: replies.preview(m.replyToId),
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

  // Optimistically apply `patch`, run the RPC, and roll back if it's refused.
  async function mutate(id: number, patch: Partial<LocalChatMessage>, rpc: () => PromiseLike<{ error: unknown }>) {
    const before = local.value.find((m) => m.id === id)
    if (!before) return false
    upsert([{ ...before, ...patch }])
    const { error: e } = await rpc()
    if (!e) return true
    const current = local.value.find((m) => m.id === id)
    if (current) upsert([{ ...current, body: before.body, editedAt: before.editedAt, deletedAt: before.deletedAt, deletedBy: before.deletedBy }])
    return false
  }

  async function edit(id: number, body: string): Promise<string | null> {
    const text = body.trim()
    if (!text) return 'Message can’t be empty — delete it instead.'
    if (text.length > 2000) return 'Messages are limited to 2,000 characters.'
    if (local.value.find((m) => m.id === id)?.body === text) return null
    const ok = await mutate(id, { body: text, editedAt: new Date().toISOString() },
      () => client.rpc('edit_chat_message', { p_id: id, p_body: text } as never))
    return ok ? null : 'Couldn’t edit — messages can only be edited for 15 minutes.'
  }

  async function remove(id: number): Promise<string | null> {
    const ok = await mutate(id, { deletedAt: new Date().toISOString(), deletedBy: userId.value },
      () => client.rpc('delete_chat_message', { p_id: id } as never))
    return ok ? null : 'Couldn’t delete that message.'
  }

  // Page back until message `id` is loaded (for jumping to a reply's original).
  async function loadUntil(id: number) {
    for (let page = 0; page < JUMP_MAX_PAGES; page++) {
      if (local.value.some((m) => m.id === id)) return true
      await until(loadingOlder).toBe(false)
      if (!hasMore.value) break
      await loadOlder()
    }
    return local.value.some((m) => m.id === id)
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
    replies.reset()
    hasMore.value = true
    loadLatest()
  }, { immediate: true })

  return {
    messages, hasMore, loading, loadingOlder, error,
    loadOlder, loadUntil, send, retry, discard, edit, remove, reload: loadLatest, toggleReaction: reactions.toggle,
  }
}
