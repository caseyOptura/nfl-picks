import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function requireUser(event: H3Event) {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, data: { code: 'UNAUTHORIZED', message: 'Not logged in' } })
  return user
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
