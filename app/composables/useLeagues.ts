import type { LeagueListItem } from '~/types/picks'

export function useLeagues() {
  const { userId } = useAuth()

  const leagues = ref<LeagueListItem[]>([])
  const pending = ref(false)
  const error = ref<Error | null>(null)

  async function refresh() {
    if (!userId.value) {
      leagues.value = []
      return
    }
    pending.value = true
    error.value = null
    try {
      leagues.value = await authFetch<LeagueListItem[]>('/api/leagues')
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
    }
  }

  watch(userId, refresh, { immediate: true })

  async function createLeague(input: {
    name: string
    season_year: number
  }): Promise<{ ok: boolean; id: string | null; error: string | null }> {
    try {
      const result = await authFetch<{ ok: boolean; id: string }>('/api/leagues', {
        method: 'POST',
        body: { name: input.name, season_year: input.season_year },
      })
      await refresh()
      return { ok: true, id: result.id, error: null }
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to create league'
      return { ok: false, id: null, error: msg }
    }
  }

  return { leagues, pending, error, refresh, createLeague }
}
