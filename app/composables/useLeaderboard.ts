import type { LeaderboardEntry, MemberView } from '~/types/picks'
import type { ScoreboardResponse } from '~/types/espn'
import { mapScoreboardEvent } from '~/composables/mapGame'

export function useLeaderboard(leagueId: MaybeRefOrGetter<string>) {
  const client = useSupabaseClient()

  const entries = ref<LeaderboardEntry[]>([])
  const pending = ref(false)
  const error = ref<Error | null>(null)

  async function refresh() {
    const id = toValue(leagueId)
    if (!id) return

    pending.value = true
    error.value = null
    try {
      const [membersResult, picksResult, scheduleData] = await Promise.all([
        client.from('league_members').select('user_id, role').eq('league_id', id),
        client.from('picks').select('user_id, game_id, picked_team_id').eq('league_id', id),
        $fetch<ScoreboardResponse>('/api/schedule'),
      ])

      const memberUserIds = (membersResult.data ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: profilesData } = await client
        .from('profiles')
        .select('id, nickname, first_name, last_name, avatar_url')
        .in('id', memberUserIds)

      type ProfileRow = { id: string; nickname: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }
      const profileMap = new Map<string, ProfileRow>()
      for (const p of (profilesData ?? []) as ProfileRow[]) {
        profileMap.set(p.id, p)
      }

      const allGames = (scheduleData.events ?? []).map(mapScoreboardEvent)
      const winnerByGame = new Map<string, string>()
      for (const g of allGames) {
        if (!g.isFinal) continue
        const winner = g.home.isWinner ? g.home : g.away.isWinner ? g.away : null
        if (winner) winnerByGame.set(g.id, winner.teamId)
      }

      type MemberRow = { user_id: string; role: 'owner' | 'member' }
      const members: MemberView[] = (membersResult.data ?? []).map((m: MemberRow) => {
        const p = profileMap.get(m.user_id)
        const displayName = p?.nickname
          ?? ([p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || 'Member')
        return {
          userId: m.user_id,
          displayName,
          avatarUrl: p?.avatar_url ?? null,
          role: m.role,
        }
      })

      type PickRow = { user_id: string; game_id: string; picked_team_id: string }
      const picksByUser = new Map<string, PickRow[]>()
      for (const p of (picksResult.data ?? []) as PickRow[]) {
        if (!picksByUser.has(p.user_id)) picksByUser.set(p.user_id, [])
        picksByUser.get(p.user_id)!.push(p)
      }

      const scored = members.map(m => {
        let wins = 0
        let losses = 0
        for (const pick of picksByUser.get(m.userId) ?? []) {
          const winner = winnerByGame.get(pick.game_id)
          if (winner === undefined) continue
          if (pick.picked_team_id === winner) wins++
          else losses++
        }
        const total = wins + losses
        const pct = total === 0 ? 0 : wins / total
        return { ...m, wins, losses, total, pct, rank: 0 }
      })

      scored.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        if (b.pct !== a.pct) return b.pct - a.pct
        return a.displayName.localeCompare(b.displayName)
      })

      let rank = 1
      for (let i = 0; i < scored.length; i++) {
        if (i === 0) {
          scored[i].rank = 1
        } else {
          const prev = scored[i - 1]
          const curr = scored[i]
          if (curr.wins === prev.wins && curr.pct === prev.pct) {
            curr.rank = prev.rank
          } else {
            rank = i + 1
            curr.rank = rank
          }
        }
      }

      entries.value = scored as LeaderboardEntry[]
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
    }
  }

  watch(() => toValue(leagueId), refresh, { immediate: true })

  return { entries, pending, error, refresh }
}
