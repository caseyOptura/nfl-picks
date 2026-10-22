import type { GameView, LiveGame } from '~/types/espn'
import { applyLive } from '~/composables/mapGame'

const POLL_MS = 20_000
/** Longest a game can plausibly run; stops a postponed game polling forever. */
const MAX_GAME_MS = 6 * 60 * 60 * 1000

/**
 * Live clock, score and ball state for `games`, polled from `/api/live` only
 * while one of them is under way and the tab is visible.
 *
 * "Under way" is judged by kickoff time, not the schedule's status, which can
 * be two minutes stale; polling stops once live data shows each game final.
 */
export function useLiveGames(games: MaybeRefOrGetter<GameView[]>) {
  const liveById = shallowRef(new Map<string, LiveGame>())
  const withLive = (game: GameView) => applyLive(game, liveById.value.get(game.id))

  const now = useNow({ scheduler: cb => useIntervalFn(cb, 30_000) })
  const anyUnderWay = computed(() => toValue(games).some((game) => {
    const sinceKickoff = now.value.getTime() - Date.parse(game.kickoffUtc)
    return sinceKickoff >= 0 && sinceKickoff < MAX_GAME_MS && !withLive(game).isFinal
  }))

  const visibility = useDocumentVisibility()
  const active = computed(() => anyUnderWay.value && visibility.value === 'visible')

  async function poll() {
    try {
      const list = await $fetch<LiveGame[]>('/api/live')
      liveById.value = new Map(list.map(g => [g.id, g]))
    }
    catch {
      // Keep the last good state; the next tick retries.
    }
  }

  const { pause, resume } = useIntervalFn(poll, POLL_MS, { immediate: false })
  watch(active, (on) => {
    if (!on) return pause()
    poll()
    resume()
  }, { immediate: true })

  return { withLive }
}
