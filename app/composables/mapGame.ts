import type { ScoreboardEvent, TeamScheduleEvent, GameView, GameSideView } from '~/types/espn'

export function mapScoreboardEvent(event: ScoreboardEvent): GameView {
  const comp = event.competitions[0]
  const home = comp.competitors.find(c => c.homeAway === 'home')!
  const away = comp.competitors.find(c => c.homeAway === 'away')!
  const isFinal = event.status.type.name === 'STATUS_FINAL'
  const isInProgress = event.status.type.name === 'STATUS_IN_PROGRESS'

  const mapSide = (c: typeof home): GameSideView => ({
    teamId: c.team.id,
    abbreviation: c.team.abbreviation,
    displayName: c.team.displayName,
    logo: c.team.logo,          // STRING on scoreboard
    score: isFinal || isInProgress ? c.score : undefined,  // c.score is already a string
    isWinner: c.winner ?? false,
  })

  return {
    id: event.id,
    kickoffUtc: event.date,
    isFinal,
    isInProgress,
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
  const isFinal = event.competitions[0].status.type.name === 'STATUS_FINAL'
  const isInProgress = event.competitions[0].status.type.name === 'STATUS_IN_PROGRESS'

  const mapSide = (c: typeof home): GameSideView => ({
    teamId: c.team.id,
    abbreviation: c.team.abbreviation,
    displayName: c.team.displayName,
    logo: c.team.logos?.[0]?.href,   // OBJECT array on team schedule
    score: isFinal || isInProgress ? c.score?.displayValue : undefined,
    isWinner: c.winner ?? false,
  })

  return {
    id: event.id,
    kickoffUtc: event.date,
    isFinal,
    isInProgress,
    week: event.week?.number,
    venue: comp.venue?.fullName,
    home: mapSide(home),
    away: mapSide(away),
  }
}
