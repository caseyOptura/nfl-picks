const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'
export const SCOREBOARD_URL = `${ESPN_BASE}/scoreboard?dates=20250901-20260201&limit=500`
export const TEAMS_URL = `${ESPN_BASE}/teams`
export const teamScheduleUrl = (id: string) => `${ESPN_BASE}/teams/${id}/schedule`
export const teamRosterUrl = (id: string) => `${ESPN_BASE}/teams/${id}/roster`
export const athleteUrl = (id: string) => `https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}`
export const athleteStatsUrl = (id: string) =>
  `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/athletes/${id}/statistics`
