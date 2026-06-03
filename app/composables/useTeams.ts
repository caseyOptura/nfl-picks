import type { TeamsResponse, TeamListEntry } from '~/types/espn'

export function useTeams() {
  const { data, pending, error, refresh } = useAsyncData('teams', () =>
    $fetch<TeamsResponse>('/api/teams')
  )
  const teams = computed<TeamListEntry[]>(() =>
    (data.value?.sports[0]?.leagues[0]?.teams ?? [])
      .map(t => t.team)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
  )
  return { teams, pending, error, refresh }
}
