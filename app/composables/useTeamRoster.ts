import type { RosterResponse, RosterGroup, RosterAthlete, PositionGroup } from '~/types/espn'

const POSITION_GROUPS: { label: string; abbrevs: string[] }[] = [
  { label: 'Quarterbacks', abbrevs: ['QB'] },
  { label: 'Running Backs', abbrevs: ['RB', 'FB', 'HB'] },
  { label: 'Wide Receivers', abbrevs: ['WR', 'WB'] },
  { label: 'Tight Ends', abbrevs: ['TE'] },
  { label: 'Offensive Line', abbrevs: ['C', 'G', 'T', 'OT', 'OG', 'OL', 'LS'] },
  { label: 'Defensive Line', abbrevs: ['DE', 'DT', 'NT', 'DL'] },
  { label: 'Linebackers', abbrevs: ['LB', 'OLB', 'ILB', 'MLB'] },
  { label: 'Defensive Backs', abbrevs: ['CB', 'S', 'SS', 'FS', 'DB'] },
  { label: 'Special Teams', abbrevs: ['K', 'P', 'PK', 'KR', 'PR'] },
]

export function useTeamRoster(teamId: string) {
  const { data, pending, error, refresh } = useAsyncData(`team-roster-${teamId}`, () =>
    $fetch<RosterResponse>(`/api/team/${teamId}/roster`)
  )

  const groups = computed<RosterGroup[]>(() =>
    (data.value?.athletes ?? []).filter(g => g.items?.length > 0)
  )

  const positionGroups = computed<PositionGroup[]>(() => {
    const allPlayers: RosterAthlete[] = (data.value?.athletes ?? []).flatMap(g => g.items ?? [])
    return POSITION_GROUPS
      .map(group => ({
        label: group.label,
        players: allPlayers.filter(p => group.abbrevs.includes(p.position?.abbreviation ?? '')),
      }))
      .filter(g => g.players.length > 0)
  })

  return { groups, positionGroups, pending, error, refresh }
}
