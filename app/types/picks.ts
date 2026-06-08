export interface LeagueRow {
  id: string
  name: string
  season_year: number
  photo_url: string | null
  created_by: string
  created_at: string
}

export interface LeagueMemberRow {
  id: string
  league_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export interface PickRow {
  id: string
  league_id: string
  user_id: string
  game_id: string
  picked_team_id: string
  created_at: string
  updated_at: string
}

export interface InvitationRow {
  id: string
  league_id: string
  email: string
  token: string
  invited_by: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
  accepted_at: string | null
}

export interface LeagueListItem extends LeagueRow {
  memberCount: number
  role: 'owner' | 'member'
}

export interface MemberView {
  userId: string
  displayName: string
  avatarUrl: string | null
  role: 'owner' | 'member'
}

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  wins: number
  losses: number
  total: number
  pct: number
  rank: number
}

export interface PickableGame {
  game: import('~/types/espn').GameView
  pickedTeamId: string | null
  locked: boolean
  correct: boolean | null
}
