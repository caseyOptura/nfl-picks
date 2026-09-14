import {
  currentSeasonYear,
  seasonDateRange,
  SEASON_TYPE_PRESEASON,
  SEASON_TYPE_REGULAR,
} from '#shared/utils/season'
import type { ScoreboardEvent } from '../../app/types/espn'

/**
 * Shared access to the ESPN unofficial API.
 *
 * ESPN needs no API key, but `site.api.espn.com` sits behind Akamai, which
 * rejects requests based on the User-Agent: a browser-like UA and an absent UA
 * both come back `403 AkamaiGHost`, while a plain non-browser client UA is
 * served normally. Runtimes disagree about what UA they send by default
 * (Node, Workers and the browser all differ), so every ESPN call goes through
 * `espnFetch`, which sends one explicit UA and retries the transient blocks.
 */

const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
const WEB_API = 'https://site.web.api.espn.com/apis/common/v3/sports/football/nfl'
const CORE_API = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl'

const USER_AGENT = 'nfl-picks/1.0 (+https://github.com/caseyOptura/nfl-picks)'

/** Statuses worth a retry: Akamai's bot block, rate limiting, and upstream blips. */
const RETRYABLE = new Set([403, 429, 500, 502, 503, 504])

export class EspnError extends Error {
  constructor(readonly status: number, readonly url: string, message?: string) {
    super(message ?? `ESPN request failed (${status}): ${url}`)
    this.name = 'EspnError'
  }
}

export async function espnFetch<T>(url: string, { retries = 2 }: { retries?: number } = {}): Promise<T> {
  let lastStatus = 0

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    })

    if (res.ok) return await res.json() as T

    lastStatus = res.status
    if (!RETRYABLE.has(res.status) || attempt === retries) break
    // Brief backoff — Akamai blocks are usually per-request, not sticky.
    await new Promise(resolve => setTimeout(resolve, 150 * 2 ** attempt))
  }

  throw new EspnError(lastStatus, url)
}

export const espnUrls = {
  teams: () => `${SITE_API}/teams`,
  teamRoster: (id: string) => `${SITE_API}/teams/${id}/roster`,
  teamSchedule: (id: string) => `${SITE_API}/teams/${id}/schedule`,
  scoreboard: (year: number) => `${SITE_API}/scoreboard?dates=${seasonDateRange(year)}&limit=500`,
  athlete: (id: string) => `${WEB_API}/athletes/${id}`,
  athleteStats: (id: string, year: number) =>
    `${CORE_API}/seasons/${year}/types/${SEASON_TYPE_REGULAR}/athletes/${id}/statistics`,
}

/**
 * Reduce an ESPN event to the fields the UI actually reads.
 *
 * ESPN returns ~6.6 MB across two seasons; the app uses about 5% of it. Sending
 * the raw payload blew the Cloudflare worker's memory ceiling (error 1102), so
 * we keep only what `mapScoreboardEvent` and the picks route consume.
 */
function trimEvent(event: ScoreboardEvent): ScoreboardEvent {
  const comp = event.competitions[0]!

  return {
    id: event.id,
    date: event.date,
    week: event.week?.number != null ? { number: event.week.number } : undefined,
    season: event.season && {
      year: event.season.year,
      type: event.season.type,
      slug: event.season.slug,
    },
    status: { type: { name: event.status.type.name } as ScoreboardEvent['status']['type'] },
    competitions: [{
      venue: comp.venue?.fullName ? { fullName: comp.venue.fullName } : undefined,
      status: { type: { name: comp.status?.type?.name } as ScoreboardEvent['status']['type'] },
      competitors: comp.competitors.map(c => ({
        homeAway: c.homeAway,
        score: c.score,
        winner: c.winner,
        // Only the overall record; the home/road splits are unused.
        records: c.records?.filter(r => r.type === 'total' || r.name === 'overall')
          .map(r => ({ type: r.type, name: r.name, summary: r.summary })),
        team: {
          id: c.team.id,
          abbreviation: c.team.abbreviation,
          displayName: c.team.displayName,
          logo: c.team.logo,
        },
      })),
    }],
  } as ScoreboardEvent
}

/**
 * Every game of the current season and the one before it, preseason excluded.
 * Shared by `/api/schedule` and the picks route so a pick submission does not
 * have to make an HTTP call back into this same worker.
 *
 * Seasons are fetched one at a time on purpose: fetching both concurrently held
 * two multi-megabyte parsed payloads in memory at once, which is what tipped the
 * worker over its limit. Each payload is trimmed and released before the next.
 */
export async function fetchSchedule(): Promise<{ seasons: number[]; events: ScoreboardEvent[] }> {
  const current = currentSeasonYear()
  const seasons = [current - 1, current]
  const events: ScoreboardEvent[] = []

  for (const year of seasons) {
    const payload = await espnFetch<{ events?: ScoreboardEvent[] }>(espnUrls.scoreboard(year))
    for (const event of payload.events ?? []) {
      if (event.season?.type === SEASON_TYPE_PRESEASON) continue
      events.push(trimEvent(event))
    }
  }

  return { seasons, events }
}
