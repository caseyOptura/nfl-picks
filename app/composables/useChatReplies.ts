import type { ChatReplyPreview, LocalChatMessage } from '~/types/chat'

interface Target { userId: string | null, kind: string, body: string, deleted: boolean }

// Resolves the message a reply points at. Usually it's already loaded; when it
// isn't (the original is further back than the loaded pages), fetch just that
// row so the quote can still render.
export function useChatReplies(
  leagueId: MaybeRefOrGetter<string>,
  local: Ref<LocalChatMessage[]>,
  nameFor: (userId: string) => string | undefined,
) {
  const client = useSupabaseClient()
  const fetched = ref(new Map<number, Target>())
  const requested = new Set<number>()

  const loaded = computed(() => new Map(local.value.flatMap((m) => (m.id === null ? [] : [[m.id, m]]))))

  function target(id: number): Target | undefined {
    const m = loaded.value.get(id)
    if (m) return { userId: m.userId, kind: m.kind, body: m.body, deleted: !!m.deletedAt }
    return fetched.value.get(id)
  }

  function preview(id: number | null): ChatReplyPreview | null {
    if (id === null) return null
    const t = target(id)
    if (!t) return { id, name: '…', snippet: '', deleted: false }
    return {
      id,
      name: t.kind === 'system' ? 'Picks Bot' : (t.userId && nameFor(t.userId)) || 'Former member',
      snippet: t.deleted ? '' : messageSnippet(t.body, 100),
      deleted: t.deleted,
    }
  }

  const authorOf = (id: number | null) => (id === null ? null : target(id)?.userId ?? null)

  watch(local, async (list) => {
    const missing = [...new Set(list.flatMap((m) => (m.replyToId === null ? [] : [m.replyToId])))]
      .filter((id) => !loaded.value.has(id) && !requested.has(id))
    if (!missing.length) return
    missing.forEach((id) => requested.add(id))
    const { data } = await client
      .from('chat_messages')
      .select('id, user_id, kind, body, deleted_at')
      .eq('league_id', toValue(leagueId))
      .in('id', missing)
    if (!data) return
    const next = new Map(fetched.value)
    for (const r of data as { id: number, user_id: string | null, kind: string, body: string, deleted_at: string | null }[]) {
      next.set(r.id, { userId: r.user_id, kind: r.kind, body: r.body, deleted: !!r.deleted_at })
    }
    fetched.value = next
  })

  function reset() {
    fetched.value = new Map()
    requested.clear()
  }

  return { preview, authorOf, reset }
}
