import type { ScoreboardResponse, GameView } from '~/types/espn'
import { mapScoreboardEvent } from '~/composables/mapGame'

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

  const regular2025 = computed(() => games.value.filter(g => !g.isPlayoff && g.kickoffUtc < '2026-06-01'))
  const playoffs2025 = computed(() => games.value.filter(g => g.isPlayoff && g.kickoffUtc < '2026-06-01'))
  const regular2026 = computed(() => games.value.filter(g => !g.isPlayoff && g.kickoffUtc >= '2026-06-01'))
  const playoffs2026 = computed(() => games.value.filter(g => g.isPlayoff && g.kickoffUtc >= '2026-06-01'))

  return {
    weekGroups2025: computed(() => weekGroups(regular2025.value)),
    playoffGroups2025: computed(() => playoffGroups(playoffs2025.value)),
    weekGroups2026: computed(() => weekGroups(regular2026.value)),
    playoffGroups2026: computed(() => playoffGroups(playoffs2026.value)),
    pending,
    error,
    refresh,
  }
}
