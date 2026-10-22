import {
  currentSeasonYear,
  seasonCalendarYears,
  SEASON_TYPE_PRESEASON,
  SEASON_TYPE_REGULAR,
} from '#shared/utils/season'
import type { H3Event } from 'h3'
import type { LiveGame, ScoreboardEvent } from '../../app/types/espn'

/**
 * Shared access to the ESPN unofficial API.
 *
 * ESPN needs no API key, but `site.api.espn.com` sits behind Akamai, which
 * rejects requests based on the User-Agent: a browser-like UA and an absent UA
 * both come back `403 AkamaiGHost`, while a plain non-browser client UA is
 * served normally. Runtimes disagree about what UA they send by default
 * (Node, Workers and the browser all differ), so every ESPN call goes through
 * `espnFetch`, which sends one explicit UA and retries the transient blocks.
 *
 * Only `site.api.espn.com` is usable from production. Akamai answers ESPN's
 * other hosts — `site.web.api.espn.com` and `sports.core.api.espn.com` — with a
 * 403 for requests from Cloudflare Workers, even though both work from a laptop
 * and from `wrangler pages dev`, so local testing will not catch it.
 */

const SITE_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
const COMMON_API = 'https://site.api.espn.com/apis/common/v3/sports/football/nfl'

const USER_AGENT = 'nfl-picks/1.0 (+https://github.com/caseyOptura/nfl-picks)'

/** Statuses worth a retry: Akamai's bot block, rate limiting, and upstream blips. */
const RETRYABLE = new Set([403, 429, 500, 502, 503, 504])

export class EspnError extends Error {
  constructor(readonly status: number, readonly url: string, message?: string) {
    super(message ?? `ESPN request failed (${status}): ${url}`)
    this.name = 'EspnError'
  }
}

/**
 * Per-attempt time limit. ESPN occasionally accepts a request from Workers and
 * never answers; without a limit the page waits until the browser gives up.
 * Healthy responses take well under a second, even the multi-MB scoreboard.
 */
const ATTEMPT_TIMEOUT_MS = 5000

export async function espnFetch<T>(url: string, { retries = 2 }: { retries?: number } = {}): Promise<T> {
  let lastStatus = 0

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // The signal also covers reading the body, where a stall can happen too.
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      })

      if (res.ok) return await res.json() as T

      lastStatus = res.status
      if (!RETRYABLE.has(res.status)) break
    }
    catch (error) {
      if ((error as Error)?.name !== 'TimeoutError') throw error
      console.warn(`[espn] no response within ${ATTEMPT_TIMEOUT_MS}ms (attempt ${attempt + 1}): ${url}`)
      lastStatus = 504
    }

    if (attempt === retries) break
    // Brief backoff — Akamai blocks are usually per-request, not sticky.
    await new Promise(resolve => setTimeout(resolve, 150 * 2 ** attempt))
  }

  throw new EspnError(lastStatus, url)
}

export const espnUrls = {
  teams: () => `${SITE_API}/teams`,
  teamRoster: (id: string) => `${SITE_API}/teams/${id}/roster`,
  teamSchedule: (id: string) => `${SITE_API}/teams/${id}/schedule`,
  /** `yyyymm` is a single calendar month, e.g. `202610`. */
  scoreboard: (yyyymm: string) => `${SITE_API}/scoreboard?dates=${yyyymm}&limit=500`,
  /** The current week only (~250 KB). */
  currentScoreboard: () => `${SITE_API}/scoreboard`,
  athlete: (id: string) => `${COMMON_API}/athletes/${id}`,
  /** Regular-season stats, one row per season, for a player's whole career. */
  athleteStats: (id: string) => `${COMMON_API}/athletes/${id}/stats?seasontype=${SEASON_TYPE_REGULAR}`,
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
    // `state` is 'in' through halftime and quarter breaks, where `name` is not
    // STATUS_IN_PROGRESS.
    status: { type: { name: event.status.type.name, state: event.status.type.state } as ScoreboardEvent['status']['type'] },
    competitions: [{
      venue: comp.venue?.fullName ? { fullName: comp.venue.fullName } : undefined,
      status: { type: { name: comp.status?.type?.name, state: comp.status?.type?.state } as ScoreboardEvent['status']['type'] },
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
 * Call `cachedSchedule` instead — a miss here downloads ~7 MB from ESPN.
 *
 * ESPN's scoreboard filters by calendar date, not by season, and a season
 * straddles two calendar years — the 2025 season's week 18 and playoffs are
 * played in 2026. So we walk each wanted season month by month, August through
 * February, and keep only the events whose `season.year` we actually asked for.
 *
 * Months are fetched one at a time, and each is trimmed and released before the
 * next, to keep the worker under its memory ceiling (error 1102). Fetching by
 * calendar year instead meant a single 4+ MB payload once a season was under
 * way, and ESPN's per-event payload keeps growing as games are played.
 */
export async function fetchSchedule(): Promise<{ seasons: number[]; events: ScoreboardEvent[] }> {
  const current = currentSeasonYear()
  const seasons = [current - 1, current]
  const wanted = new Set(seasons)

  // Keyed by event id: deduping keeps a shifted ESPN boundary from producing a
  // doubled game.
  const byId = new Map<string, ScoreboardEvent>()

  for (const month of seasons.flatMap(seasonMonths)) {
    const payload = await espnFetch<{ events?: ScoreboardEvent[] }>(espnUrls.scoreboard(month))
    for (const event of payload.events ?? []) {
      if (event.season?.type === SEASON_TYPE_PRESEASON) continue
      if (!event.season || !wanted.has(event.season.year)) continue
      byId.set(event.id, trimEvent(event))
    }
  }

  return { seasons, events: [...byId.values()] }
}

/** `yyyymm` for every month a season's games can fall in: August through February. */
function seasonMonths(season: number): string[] {
  const [start, end] = seasonCalendarYears(season)
  return [
    ...[8, 9, 10, 11, 12].map(m => `${start}${String(m).padStart(2, '0')}`),
    ...[1, 2].map(m => `${end}0${m}`),
  ]
}

/**
 * `fetchSchedule` behind the shared KV cache (`espn-cache`), so the whole site
 * pays for at most one ESPN download every two minutes. Backs both
 * `/api/schedule` and the picks route. See `swrCache` for the caching rules.
 *
 * Two minutes keeps live scores reasonably fresh while staying near the KV
 * free tier's 1,000 writes a day. The picks route can rely on it because a game
 * locks at kickoff by clock time, not by ESPN's status.
 *
 * Picks deliberately do not look the game up on ESPN's core API: Akamai serves
 * `sports.core.api.espn.com` with a 403 to requests from Cloudflare Workers.
 */
export function cachedSchedule(event: H3Event) {
  return swrCache(event, {
    storage: 'espn-cache',
    key: 'schedule.json',
    maxAge: 120,
    fetch: fetchSchedule,
  })
}

/**
 * Clock, score and ball state for every game this week that has kicked off,
 * including ones just gone final (so the client sees a result before the
 * two-minute schedule cache does). Call `cachedLive` instead.
 */
export async function fetchLive(): Promise<LiveGame[]> {
  // No retries: the client polls again in 20s, and a retry would only make a
  // stalled request wait up to 15s before failing.
  const payload = await espnFetch<{ events?: ScoreboardEvent[] }>(espnUrls.currentScoreboard(), { retries: 0 })
  const live: LiveGame[] = []

  for (const event of payload.events ?? []) {
    const comp = event.competitions[0]
    const state = event.status.type.state
    if (!comp || state === 'pre') continue

    const home = comp.competitors.find(c => c.homeAway === 'home')
    const away = comp.competitors.find(c => c.homeAway === 'away')
    const sit = comp.situation
    // Kickoffs and extra points carry no down.
    const hasDown = (sit?.down ?? 0) > 0

    live.push({
      id: event.id,
      state,
      statusName: event.status.type.name,
      period: event.status.period ?? 0,
      displayClock: event.status.displayClock ?? '',
      shortDetail: event.status.type.shortDetail,
      homeScore: home?.score ?? '0',
      awayScore: away?.score ?? '0',
      homeWinner: home?.winner ?? false,
      awayWinner: away?.winner ?? false,
      possessionTeamId: sit?.possession || undefined,
      downDistance: hasDown ? sit?.shortDownDistanceText : undefined,
      ballOn: hasDown ? sit?.possessionText : undefined,
      isRedZone: sit?.isRedZone ?? false,
    })
  }

  return live
}

/**
 * `fetchLive` behind a 15-second per-isolate cache. Memory, not KV: refreshing
 * this often would exhaust the free tier's 1,000 KV writes a day in an
 * afternoon. A cold isolate costs one ~250 KB ESPN fetch.
 *
 * Past a minute old the entry is not served at all: an isolate idle since an
 * earlier game would otherwise hand back that old state for one poll, and a
 * score could briefly jump backwards. If that fetch fails, the request fails
 * and the client keeps the last state it had.
 */
export function cachedLive(event: H3Event) {
  return swrCache(event, {
    storage: 'espn-memory',
    key: 'live.json',
    maxAge: 15,
    maxStale: 60,
    fetch: fetchLive,
  })
}
