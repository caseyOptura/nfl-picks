import type { ChatNotificationPrefs } from '~/types/chat'

// Per-league notification preferences (chat_notification_prefs). A missing
// row means the defaults. Module-level so ChatNotifier and the settings page
// share one copy and a change applies to toasts immediately.

export const DEFAULT_CHAT_PREFS: ChatNotificationPrefs = { muted: false, push_messages: true, push_reactions: true }

const prefs = ref<Record<string, ChatNotificationPrefs>>({})

export function useChatPrefs() {
  const client = useSupabaseClient()
  const { userId } = useAuth()

  async function load() {
    if (!userId.value) return
    const { data, error } = await client
      .from('chat_notification_prefs')
      .select('league_id, muted, push_messages, push_reactions')
      .eq('user_id', userId.value)
    if (error) return
    prefs.value = Object.fromEntries(
      (data as (ChatNotificationPrefs & { league_id: string })[]).map(({ league_id, ...p }) => [league_id, p]),
    )
  }

  const prefsFor = (leagueId: string) => prefs.value[leagueId] ?? DEFAULT_CHAT_PREFS
  const isMuted = (leagueId: string) => prefsFor(leagueId).muted

  async function update(leagueId: string, patch: Partial<ChatNotificationPrefs>): Promise<string | null> {
    if (!userId.value) return null
    const before = prefsFor(leagueId)
    const next = { ...before, ...patch }
    prefs.value = { ...prefs.value, [leagueId]: next }
    const { error } = await client
      .from('chat_notification_prefs')
      .upsert({ league_id: leagueId, user_id: userId.value, ...next } as never)
    if (!error) return null
    prefs.value = { ...prefs.value, [leagueId]: before }
    return 'Couldn’t save that setting.'
  }

  function reset() {
    prefs.value = {}
  }

  return { load, prefsFor, isMuted, update, reset }
}
