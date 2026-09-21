import type { JwtPayload } from '@supabase/auth-js'

export interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
  nickname: string | null
  avatar_url: string | null
  email: string | null
  updated_at: string
}

export interface ProfileUpdate {
  first_name?: string | null
  last_name?: string | null
  nickname?: string
  avatar_url?: string | null
}

export type AuthUser = JwtPayload

export interface AuthResult {
  ok: boolean
  error: string | null
  /**
   * Set when the failure is "this email is already registered". The signup page
   * uses it to offer a log-in link instead of leaving the user at a dead end —
   * the dead end is what pushes people into creating a second account.
   */
  emailTaken?: boolean
}
