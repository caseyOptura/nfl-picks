import { espnFetch, espnUrls, EspnError } from '../../../utils/espn'
import { currentSeasonYear } from '#shared/utils/season'

/**
 * Regular-season stats for one player.
 *
 * A player with no stats in the current season yet (injured, or early in the
 * year before ESPN publishes them) 404s on the current season while the
 * previous season still resolves, so fall back one year rather than showing an
 * empty stat sheet. Genuine upstream failures still surface as errors instead
 * of being flattened into "no stats".
 */
export default defineCachedEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing athlete id' })

  const current = currentSeasonYear()

  for (const year of [current, current - 1]) {
    try {
      const stats = await espnFetch<Record<string, unknown>>(espnUrls.athleteStats(id, year))
      // `seasonYear`, not `season` — ESPN's own payload already uses `season`.
      return { ...stats, seasonYear: year }
    } catch (error) {
      if (error instanceof EspnError && error.status === 404) continue
      throw error
    }
  }

  return { seasonYear: null, splits: { categories: [] } }
}, {
  name: 'espn-athlete-stats',
  maxAge: 60 * 10,
  getKey: event => getRouterParam(event, 'id') ?? 'unknown',
})
