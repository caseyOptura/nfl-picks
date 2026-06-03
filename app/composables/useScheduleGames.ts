import type { ScoreboardResponse, GameView } from '~/types/espn'
import { mapScoreboardEvent } from '~/composables/mapGame'

export function useScheduleGames() {
  const { data, pending, error, refresh } = useAsyncData('schedule', () =>
    $fetch<ScoreboardResponse>('/api/schedule')
  )
  const games = computed<GameView[]>(() =>
    (data.value?.events ?? []).map(mapScoreboardEvent)
  )
  const gamesByWeek = computed(() => {
    const map = new Map<number, GameView[]>()
    for (const g of games.value) {
      const w = g.week ?? 0
      if (!map.has(w)) map.set(w, [])
      map.get(w)!.push(g)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([week, games]) => ({ week, games }))
  })
  return { games, gamesByWeek, pending, error, refresh }
}
