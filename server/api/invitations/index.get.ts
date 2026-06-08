import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const leagueId = getQuery(event).leagueId as string | undefined

  if (!leagueId) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_QUERY', message: 'leagueId is required' } })
  }

  const service = serverSupabaseServiceRole(event)
  await assertMember(service, leagueId, user.id)

  const { data, error } = await service
    .from('invitations')
    .select('id, email, created_at')
    .eq('league_id', leagueId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, data: { code: 'FETCH_FAILED', message: error.message } })
  return data ?? []
})
