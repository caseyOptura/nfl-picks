import type { RosterResponse, RosterGroup } from '~/types/espn'

export function useTeamRoster(teamId: string) {
  const { data, pending, error, refresh } = useAsyncData(`team-roster-${teamId}`, () =>
    $fetch<RosterResponse>(`/api/team/${teamId}/roster`)
  )
  const groups = computed<RosterGroup[]>(() =>
    (data.value?.athletes ?? []).filter(g => g.items?.length > 0)
  )
  return { groups, pending, error, refresh }
}
