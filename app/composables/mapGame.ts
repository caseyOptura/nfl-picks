import type { ScoreboardEvent, TeamScheduleEvent, GameView, GameSideView, ScoreboardCompetitor, EspnStatusType, LiveGame } from '~/types/espn'

/** The overall W-L record, ignoring the home/road splits ESPN also returns. */
function overallRecord(competitor: ScoreboardCompetitor): string | undefined {
  return competitor.records?.find(r => r.type === 'total' || r.name === 'overall')?.summary
}

/**
 * Under way, halftime and quarter breaks included: those have their own status
 * names, but `state` stays 'in'. Schedule payloads cached before `state` was
 * kept fall back to the name.
 */
function inProgress(type: EspnStatusType): boolean {
  return type.state === 'in' || type.name === 'STATUS_IN_PROGRESS'
}

const PLAYOFF_ROUNDS: Record<number, string> = {
  1: 'Wild Card',
  2: 'Divisional Round',
  3: 'Conference Championship',
  4: 'Super Bowl',
}

export function mapScoreboardEvent(event: ScoreboardEvent): GameView {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')!
  const away = comp.competitors.find(c => c.homeAway === 'away')!
  const isFinal = event.status.type.name === 'STATUS_FINAL'
  const isInProgress = inProgress(event.status.type)
  const isPlayoff = event.season?.type === 3

  const mapSide = (c: typeof home): GameSideView => ({
    teamId: c.team.id,
    abbreviation: c.team.abbreviation,
    displayName: c.team.displayName,
    logo: c.team.logo,
    score: isFinal || isInProgress ? c.score : undefined,
    isWinner: c.winner ?? false,
    record: overallRecord(c),
  })

  return {
    id: event.id,
    kickoffUtc: event.date,
    seasonYear: event.season?.year,
    isFinal,
    isInProgress,
    isPlayoff,
    playoffRound: isPlayoff ? PLAYOFF_ROUNDS[event.week?.number ?? 0] : undefined,
    week: event.week?.number,
    venue: comp.venue?.fullName,
    home: mapSide(home),
    away: mapSide(away),
  }
}

export function mapTeamScheduleEvent(event: TeamScheduleEvent): GameView {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')!
  const away = comp.competitors.find(c => c.homeAway === 'away')!
  const isFinal = comp.status.type.name === 'STATUS_FINAL'
  const isInProgress = inProgress(comp.status.type)

  const mapSide = (c: typeof home): GameSideView => ({
    teamId: c.team.id,
    abbreviation: c.team.abbreviation,
    displayName: c.team.displayName,
    logo: c.team.logos?.[0]?.href,
    score: isFinal || isInProgress ? c.score?.displayValue : undefined,
    isWinner: c.winner ?? false,
  })

  return {
    id: event.id,
    kickoffUtc: event.date,
    isFinal,
    isInProgress,
    isPlayoff: false,
    week: event.week?.number,
    venue: comp.venue?.fullName,
    home: mapSide(home),
    away: mapSide(away),
  }
}

/**
 * Overlay `/api/live` onto a game from the schedule, which can be two minutes
 * behind. Postponed and cancelled games are left as the schedule has them.
 */
export function applyLive(game: GameView, live: LiveGame | undefined): GameView {
  if (!live) return game
  const isFinal = live.statusName === 'STATUS_FINAL'
  const isInProgress = live.state === 'in'
  if (!isFinal && !isInProgress) return game

  return {
    ...game,
    isFinal,
    isInProgress,
    home: { ...game.home, score: live.homeScore, isWinner: live.homeWinner },
    away: { ...game.away, score: live.awayScore, isWinner: live.awayWinner },
    live: isInProgress ? live : undefined,
  }
}

/** 'Q2 · 12:34', 'OT · 4:10', or ESPN's line for breaks ('Halftime', 'End of 3rd'). */
export function liveClockLabel(live: LiveGame): string {
  if (live.statusName !== 'STATUS_IN_PROGRESS') return live.shortDetail
  const quarter = live.period <= 4 ? `Q${live.period}` : live.period === 5 ? 'OT' : `${live.period - 4}OT`
  return `${quarter} · ${live.displayClock}`
}
