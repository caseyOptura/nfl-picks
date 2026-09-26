import { REACTION_EMOJI } from '~/types/chat'
import type { ChatReactionRow, ChatReactionSummary, ReactionEmoji } from '~/types/chat'

type EmojiUsers = Partial<Record<ReactionEmoji, string[]>>

// Reaction state for the messages useLeagueChat has loaded. Toggles are
// optimistic; reaction_changed events (for everyone, including our own
// toggles) reconcile. Both paths are idempotent, so their order doesn't matter.
export function useChatReactions(leagueId: MaybeRefOrGetter<string>) {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const hub = useChatRealtime()

  const byMessage = ref<Record<number, EmojiUsers>>({})

  function apply(messageId: number, emoji: ReactionEmoji, user: string, add: boolean) {
    const entry = byMessage.value[messageId] ?? {}
    const users = (entry[emoji] ?? []).filter((u) => u !== user)
    if (add) users.push(user)
    byMessage.value[messageId] = { ...entry, [emoji]: users }
  }

  // Replaces state for exactly these messages, so reactions removed while we
  // weren't listening disappear too.
  async function load(messageIds: number[]) {
    if (!messageIds.length) return
    const { data, error } = await client
      .from('chat_reactions')
      .select('message_id, user_id, emoji, created_at')
      .in('message_id', messageIds)
      .order('created_at', { ascending: true })
    if (error) return
    const next: Record<number, EmojiUsers> = {}
    for (const id of messageIds) next[id] = {}
    for (const r of data as ChatReactionRow[]) (next[r.message_id]![r.emoji] ??= []).push(r.user_id)
    byMessage.value = { ...byMessage.value, ...next }
  }

  function summaries(messageId: number | null): ChatReactionSummary[] {
    const entry = messageId === null ? undefined : byMessage.value[messageId]
    if (!entry) return []
    const me = userId.value
    return REACTION_EMOJI.flatMap((emoji) => {
      const userIds = entry[emoji] ?? []
      return userIds.length ? [{ emoji, count: userIds.length, userIds, mine: !!me && userIds.includes(me) }] : []
    })
  }

  async function toggle(messageId: number, emoji: ReactionEmoji): Promise<string | null> {
    const me = userId.value
    if (!me) return null
    const had = byMessage.value[messageId]?.[emoji]?.includes(me) ?? false
    apply(messageId, emoji, me, !had)
    const table = client.from('chat_reactions')
    const { error } = had
      ? await table.delete().match({ message_id: messageId, user_id: me, emoji })
      // league_id is filled in by the chat_reactions_before_insert trigger.
      : await table.insert({ message_id: messageId, user_id: me, emoji } as never)
    // A duplicate insert means a double tap raced us: we did react.
    if (!error || error.code === '23505') return null
    apply(messageId, emoji, me, had)
    return 'Couldn’t update your reaction.'
  }

  function reset() {
    byMessage.value = {}
  }

  hub.onScoped('reaction_changed', (e) => {
    if (e.leagueId === toValue(leagueId)) apply(e.messageId, e.emoji, e.userId, e.op === 'added')
  })

  return { load, summaries, toggle, reset }
}
