/**
 * NFL season helpers, shared by the Nuxt app and the Nitro server routes.
 *
 * A "season year" is the calendar year the season kicks off in: the 2026
 * season runs Aug 2026 through the Super Bowl in Feb 2027. Everything in the
 * app keys off this number rather than off wall-clock dates, so nothing needs
 * editing when the season rolls over.
 */

/** First month (0-indexed) of a new NFL season. August = preseason kickoff. */
const SEASON_START_MONTH = 7

/** The season year currently in progress. Jan–Jul still belong to last season. */
export function currentSeasonYear(now: Date = new Date()): number {
  const year = now.getUTCFullYear()
  return now.getUTCMonth() >= SEASON_START_MONTH ? year : year - 1
}

/**
 * ESPN scoreboard `dates` range covering a whole season, preseason through the
 * Super Bowl. Preseason games are filtered out downstream by `season.type`.
 */
export function seasonDateRange(year: number): string {
  return `${year}0801-${year + 1}0301`
}

/** Seasons the app offers, newest last: the current one and the one before it. */
export function selectableSeasons(now: Date = new Date()): number[] {
  const current = currentSeasonYear(now)
  return [current - 1, current]
}

/** ESPN season types. 1 = preseason, 2 = regular season, 3 = postseason. */
export const SEASON_TYPE_PRESEASON = 1
export const SEASON_TYPE_REGULAR = 2
export const SEASON_TYPE_POSTSEASON = 3
