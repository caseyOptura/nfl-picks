import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serverSupabaseServiceRole } from '#supabase/server'

// Every route that calls this goes on to use the service-role client, which
// bypasses RLS, so the returned id is the only thing standing between a caller
// and other users' data. getClaims() checks the signature and expiry (locally
// against the cached JWKS for asymmetric keys, via the Auth server otherwise);
// merely decoding the payload would accept any hand-written token.
export async function requireUser(event: H3Event): Promise<{ id: string; email: string | undefined }> {
  const authHeader = getHeader(event, 'authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw createError({ statusCode: 401, data: { code: 'UNAUTHORIZED', message: 'Not logged in' } })

  const { data, error } = await serverSupabaseServiceRole(event).auth.getClaims(token)
  const sub = data?.claims.sub
  if (error || !sub || data.claims.role !== 'authenticated') {
    throw createError({ statusCode: 401, data: { code: 'UNAUTHORIZED', message: 'Invalid token' } })
  }
  return { id: sub, email: data.claims.email }
}

export async function assertMember(serviceClient: SupabaseClient, leagueId: string, userId: string) {
  const { data } = await serviceClient
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) throw createError({ statusCode: 403, data: { code: 'NOT_MEMBER', message: 'You are not a member of this league' } })
}

export async function assertOwner(serviceClient: SupabaseClient, leagueId: string, userId: string) {
  const { data } = await serviceClient
    .from('leagues')
    .select('id')
    .eq('id', leagueId)
    .eq('created_by', userId)
    .maybeSingle()
  if (!data) throw createError({ statusCode: 403, data: { code: 'NOT_OWNER', message: 'You are not the owner of this league' } })
}
