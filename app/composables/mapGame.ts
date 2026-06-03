import type { ScoreboardEvent, TeamScheduleEvent, GameView, GameSideView } from '~/types/espn'

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
  const isInProgress = event.status.type.name === 'STATUS_IN_PROGRESS'
  const isPlayoff = event.season?.type === 3

  const mapSide = (c: typeof home): GameSideView => ({
    teamId: c.team.id,
    abbreviation: c.team.abbreviation,
    displayName: c.team.displayName,
    logo: c.team.logo,
    score: isFinal || isInProgress ? c.score : undefined,
    isWinner: c.winner ?? false,
  })

  return {
    id: event.id,
    kickoffUtc: event.date,
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
  const isInProgress = comp.status.type.name === 'STATUS_IN_PROGRESS'

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
