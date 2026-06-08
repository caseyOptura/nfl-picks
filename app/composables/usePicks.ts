import type { PickableGame, MemberPickSummary } from '~/types/picks'
import type { ScoreboardResponse } from '~/types/espn'
import { mapScoreboardEvent } from '~/composables/mapGame'

const SEASON_2026_CUTOFF = new Date('2026-06-01T00:00:00Z')

function isGameLocked(game: ReturnType<typeof mapScoreboardEvent>): boolean {
  return game.isFinal || game.isInProgress || new Date(game.kickoffUtc) <= new Date()
}

function getCorrect(game: ReturnType<typeof mapScoreboardEvent>, pickedTeamId: string | null): boolean | null {
  if (!game.isFinal || pickedTeamId === null) return null
  const winner = game.home.isWinner ? game.home : game.away.isWinner ? game.away : null
  if (!winner) return null
  return winner.teamId === pickedTeamId
}

export function usePicks(leagueId: MaybeRefOrGetter<string>, seasonYear: MaybeRefOrGetter<number>) {
  const { userId } = useAuth()
  const client = useSupabaseClient()

  const games = ref<PickableGame[]>([])
  const pending = ref(false)
  const error = ref<Error | null>(null)

  const byWeek = computed(() => {
    const regularWeeks = new Map<number, PickableGame[]>()
    const playoffGames: PickableGame[] = []

    for (const pg of games.value) {
      if (pg.game.isPlayoff) {
        playoffGames.push(pg)
      } else {
        const w = pg.game.week ?? 0
        if (!regularWeeks.has(w)) regularWeeks.set(w, [])
        regularWeeks.get(w)!.push(pg)
      }
    }

    const sections: { week: number | string; games: PickableGame[] }[] = []
    const sortedWeeks = [...regularWeeks.keys()].sort((a, b) => a - b)
    for (const w of sortedWeeks) {
      sections.push({ week: w, games: regularWeeks.get(w)! })
    }
    if (playoffGames.length > 0) {
      sections.push({ week: 'Playoffs', games: playoffGames })
    }
    return sections
  })

  async function refresh() {
    const id = toValue(leagueId)
    const year = toValue(seasonYear)
    if (!id || !year || !userId.value) return

    pending.value = true
    error.value = null
    try {
      type ProfileRow = { id: string; nickname: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }
      type AllPickRow = { user_id: string; game_id: string; picked_team_id: string }

      const [scheduleData, allPicksResult, membersResult] = await Promise.all([
        $fetch<ScoreboardResponse>('/api/schedule'),
        client.from('picks').select('user_id, game_id, picked_team_id').eq('league_id', id),
        client.from('league_members').select('user_id').eq('league_id', id),
      ])

      const memberUserIds = (membersResult.data ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: profilesData } = await client
        .from('profiles')
        .select('id, nickname, first_name, last_name, avatar_url')
        .in('id', memberUserIds)

      const memberMap = new Map<string, { displayName: string; avatarUrl: string | null }>()
      for (const p of (profilesData ?? []) as ProfileRow[]) {
        const displayName = p.nickname
          ?? ([p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Member')
        memberMap.set(p.id, { displayName, avatarUrl: p.avatar_url })
      }

      const pickMap = new Map<string, string>()
      const allPicksByGame = new Map<string, AllPickRow[]>()
      for (const p of (allPicksResult.data ?? []) as AllPickRow[]) {
        if (p.user_id === userId.value) pickMap.set(p.game_id, p.picked_team_id)
        if (!allPicksByGame.has(p.game_id)) allPicksByGame.set(p.game_id, [])
        allPicksByGame.get(p.game_id)!.push(p)
      }

      const cutoff = SEASON_2026_CUTOFF
      const allGames = (scheduleData.events ?? []).map(mapScoreboardEvent)
      const filtered = allGames.filter(g => {
        const kickoff = new Date(g.kickoffUtc)
        return year === 2025 ? kickoff < cutoff : kickoff >= cutoff
      })

      games.value = filtered.map(g => {
        const pickedTeamId = pickMap.get(g.id) ?? null
        const memberPicks: MemberPickSummary[] = (allPicksByGame.get(g.id) ?? [])
          .filter(p => p.user_id !== userId.value)
          .map(p => {
            const info = memberMap.get(p.user_id)
            return {
              userId: p.user_id,
              displayName: info?.displayName ?? 'Member',
              avatarUrl: info?.avatarUrl ?? null,
              pickedTeamId: p.picked_team_id,
            }
          })
        return {
          game: g,
          pickedTeamId,
          locked: isGameLocked(g),
          correct: getCorrect(g, pickedTeamId),
          memberPicks,
        }
      })
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
    }
  }

  async function submitPick(gameId: string, teamId: string): Promise<{ ok: boolean; error: string | null }> {
    const id = toValue(leagueId)
    const target = games.value.find(pg => pg.game.id === gameId)
    if (!target) return { ok: false, error: 'Game not found' }
    if (target.locked) return { ok: false, error: 'Game is locked' }

    const prevPickedTeamId = target.pickedTeamId
    const prevCorrect = target.correct
    target.pickedTeamId = teamId
    target.correct = getCorrect(target.game, teamId)

    try {
      await authFetch('/api/picks', {
        method: 'POST',
        body: { leagueId: id, gameId, pickedTeamId: teamId },
      })
      return { ok: true, error: null }
    } catch (e: unknown) {
      target.pickedTeamId = prevPickedTeamId
      target.correct = prevCorrect
      const msg = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to save pick'
      return { ok: false, error: msg }
    }
  }

  watch(
    [() => toValue(leagueId), () => toValue(seasonYear), userId],
    refresh,
    { immediate: true }
  )

  return { games, byWeek, pending, error, refresh, submitPick }
}
