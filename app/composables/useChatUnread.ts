// Unread message counts per league, for the nav badge and league cards.
// Seeded from chat_unread_counts() on login and focus, then kept current
// from hub events. Module-level so every caller shares one copy.

const counts = ref<Record<string, number>>({})
// The league whose chat page is open in this tab, if any.
const viewing = ref<string | null>(null)

export function useChatUnread() {
  const client = useSupabaseClient()

  const total = computed(() => Object.values(counts.value).reduce((a, b) => a + b, 0))

  async function load() {
    const { data, error } = await client.rpc('chat_unread_counts' as never)
    if (error) {
      console.warn('[chat] unread counts failed', error.message)
      return
    }
    const next: Record<string, number> = {}
    for (const r of data as unknown as { league_id: string; unread: number }[]) next[r.league_id] = Number(r.unread)
    // The open chat is read by definition, even if its read-state write is still in flight.
    if (viewing.value) next[viewing.value] = 0
    counts.value = next
  }

  function bump(leagueId: string) {
    counts.value = { ...counts.value, [leagueId]: (counts.value[leagueId] ?? 0) + 1 }
  }

  function clear(leagueId: string) {
    if (counts.value[leagueId]) counts.value = { ...counts.value, [leagueId]: 0 }
  }

  function reset() {
    counts.value = {}
    viewing.value = null
  }

  const countFor = (leagueId: string) => counts.value[leagueId] ?? 0

  return { counts: readonly(counts), total, viewing, countFor, load, bump, clear, reset }
}
