import type { TeamScheduleResponse, TeamScheduleTeam, GameView } from '~/types/espn'
import { mapTeamScheduleEvent } from '~/composables/mapGame'

export function useTeamSchedule(teamId: string) {
  const { data, pending, error, refresh } = useAsyncData(`team-schedule-${teamId}`, () =>
    $fetch<TeamScheduleResponse>(`/api/team/${teamId}/schedule`)
  )
  const team = computed<TeamScheduleTeam | null>(() => data.value?.team ?? null)
  const games = computed<GameView[]>(() =>
    (data.value?.events ?? []).map(mapTeamScheduleEvent)
  )
  const completedGames = computed(() => games.value.filter(g => g.isFinal))
  const upcomingGames = computed(() => games.value.filter(g => !g.isFinal && !g.isInProgress))
  return { team, completedGames, upcomingGames, pending, error, refresh }
}
