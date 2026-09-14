import type { ScoreboardResponse, GameView } from '~/types/espn'
import { mapScoreboardEvent } from '~/composables/mapGame'
import { selectableSeasons } from '#shared/utils/season'

function weekGroups(gameList: GameView[]) {
  const map = new Map<number, GameView[]>()
  for (const g of gameList) {
    const w = g.week ?? 0
    if (!map.has(w)) map.set(w, [])
    map.get(w)!.push(g)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, games]) => ({ week, games }))
}

function playoffGroups(gameList: GameView[]) {
  const map = new Map<string, GameView[]>()
  for (const g of gameList) {
    const round = g.playoffRound ?? 'Playoffs'
    if (!map.has(round)) map.set(round, [])
    map.get(round)!.push(g)
  }
  const order = ['Wild Card', 'Divisional Round', 'Conference Championship', 'Super Bowl']
  return [...map.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([round, games]) => ({ round, games }))
}

export function useScheduleGames() {
  const { data, pending, error, refresh } = useAsyncData('schedule', () =>
    $fetch<ScoreboardResponse>('/api/schedule')
  )

  const games = computed<GameView[]>(() =>
    (data.value?.events ?? []).map(mapScoreboardEvent)
  )

  /** Seasons the payload actually covers; falls back to the date-derived pair. */
  const seasons = computed<number[]>(() => data.value?.seasons ?? selectableSeasons())

  const forSeason = (year: number) => games.value.filter(g => g.seasonYear === year)

  return {
    seasons,
    weekGroupsFor: (year: number) => weekGroups(forSeason(year).filter(g => !g.isPlayoff)),
    playoffGroupsFor: (year: number) => playoffGroups(forSeason(year).filter(g => g.isPlayoff)),
    pending,
    error,
    refresh,
  }
}
