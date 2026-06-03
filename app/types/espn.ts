// Shared
export interface EspnLogo {
  href: string
  width?: number
  height?: number
  alt?: string
}

// Teams list endpoint
export interface TeamListEntry {
  id: string
  abbreviation: string
  displayName: string
  shortDisplayName: string
  name: string
  location: string
  color: string           // hex without '#'
  alternateColor: string
  isActive: boolean
  logos: EspnLogo[]
}
export interface TeamsLeague { teams: { team: TeamListEntry }[] }
export interface TeamsSport { leagues: TeamsLeague[] }
export interface TeamsResponse { sports: TeamsSport[] }

// Scoreboard endpoint — score is STRING, logo at competitor.team.logo
export interface EspnStatusType {
  name: 'STATUS_SCHEDULED' | 'STATUS_IN_PROGRESS' | 'STATUS_FINAL' | string
  state: 'pre' | 'in' | 'post' | string
  completed: boolean
  shortDetail: string
}
export interface EspnStatus { type: EspnStatusType }
export interface EspnVenueAddress { city?: string; state?: string }
export interface EspnVenue { fullName?: string; address?: EspnVenueAddress }
export interface ScoreboardCompetitorTeam {
  id: string
  abbreviation: string
  displayName: string
  logo?: string           // STRING url on scoreboard
}
export interface ScoreboardCompetitor {
  homeAway: 'home' | 'away'
  score: string           // STRING on scoreboard
  winner?: boolean
  team: ScoreboardCompetitorTeam
}
export interface ScoreboardCompetition {
  competitors: ScoreboardCompetitor[]
  venue?: EspnVenue
  status: EspnStatus
}
export interface ScoreboardEvent {
  id: string
  date: string
  name: string
  shortName: string
  week?: { number: number }
  status: EspnStatus
  competitions: ScoreboardCompetition[]
}
export interface ScoreboardResponse { events: ScoreboardEvent[] }

// Team schedule endpoint — score is OBJECT, logos at competitor.team.logos[0].href
export interface TeamScheduleTeam {
  id: string
  displayName: string
  location: string
  name: string
  color?: string
  alternateColor?: string
  logos?: EspnLogo[]
  recordSummary?: string    // "6-11"
  standingSummary?: string  // "3rd in AFC West"
}
export interface TeamScheduleScore { value: number; displayValue: string }
export interface TeamScheduleCompetitorTeam {
  id: string
  abbreviation: string
  displayName: string
  logos?: EspnLogo[]
}
export interface TeamScheduleCompetitor {
  homeAway: 'home' | 'away'
  score?: TeamScheduleScore  // OBJECT on schedule
  winner?: boolean
  team: TeamScheduleCompetitorTeam
}
export interface TeamScheduleCompetition {
  competitors: TeamScheduleCompetitor[]
  venue?: EspnVenue
  status: EspnStatus
}
export interface TeamScheduleEvent {
  id: string
  date: string
  name: string
  shortName: string
  week?: { number: number }
  competitions: TeamScheduleCompetition[]
}
export interface TeamScheduleResponse {
  team: TeamScheduleTeam
  events: TeamScheduleEvent[]
}

// Roster endpoint
export interface RosterAthlete {
  id: string
  fullName: string
  displayName: string
  jersey?: string
  position?: { abbreviation: string }
  age?: number | null
  displayHeight?: string
  displayWeight?: string
  experience?: { years: number }
  headshot?: { href: string }
  college?: { name: string }
}
export interface RosterGroup {
  position: string  // "offense" | "defense" | "specialTeam" | ...
  items: RosterAthlete[]
}
export interface RosterResponse { athletes: RosterGroup[] }

// View models returned by composables
export interface GameSideView {
  teamId: string
  abbreviation: string
  displayName: string
  logo?: string   // always a string, normalized from both endpoints
  score?: string   // always a string, normalized from both endpoints
  isWinner: boolean
}
export interface GameView {
  id: string
  kickoffUtc: string
  isFinal: boolean
  isInProgress: boolean
  week?: number
  venue?: string
  home: GameSideView
  away: GameSideView
}
