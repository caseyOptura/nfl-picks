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
}
