import { espnFetch, espnUrls } from '../../../utils/espn'
import { currentSeasonYear } from '#shared/utils/season'
import type { PlayerStatsResponse, StatsCategory } from '../../../../app/types/espn'

/** ESPN's career stats: per category, parallel arrays of labels and one row per season. */
interface CareerStats {
  categories?: {
    name: string
    displayName: string
    labels: string[]
    names: string[]
    displayNames: string[]
    statistics?: { season?: { year?: number }; stats: string[] }[]
  }[]
}

/**
 * Regular-season stats for one player, reshaped into the per-category list the
 * player page renders.
 *
 * ESPN returns the whole career in one call, so the season is picked here: the
 * current one if the player has stats in it yet, otherwise last season (an
 * injured player, or early in the year before ESPN publishes them), rather than
 * showing an empty stat sheet. Every category comes from that same season.
 */
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing athlete id' })
  return swrCache(event, {
    storage: 'espn-memory',
    key: `athlete-stats:${id}`,
    maxAge: 60 * 10,
    fetch: () => fetchPlayerStats(id),
  })
})

async function fetchPlayerStats(id: string): Promise<PlayerStatsResponse> {
  const career = await espnFetch<CareerStats>(espnUrls.athleteStats(id))
  const categories = career.categories ?? []

  const current = currentSeasonYear()
  const hasSeason = (year: number) =>
    categories.some(c => c.statistics?.some(row => row.season?.year === year))
  const seasonYear = [current, current - 1].find(hasSeason)

  if (seasonYear == null) return { seasonYear: null, splits: { categories: [] } }

  const result: StatsCategory[] = []
  for (const cat of categories) {
    // A player traded mid-season can have a row per team; take the last one.
    const row = cat.statistics?.findLast(r => r.season?.year === seasonYear)
    if (!row) continue

    result.push({
      name: cat.name,
      displayName: cat.displayName,
      stats: cat.names.map((name, i) => {
        const displayValue = row.stats[i] ?? ''
        const value = Number(displayValue.replace(/,/g, ''))
        return {
          name,
          displayName: cat.displayNames[i] ?? name,
          shortDisplayName: cat.labels[i],
          abbreviation: cat.labels[i],
          value: Number.isFinite(value) ? value : null,
          displayValue,
        }
      }),
    })
  }

  return { seasonYear, splits: { categories: result } }
}
