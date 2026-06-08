import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const leagueId = getRouterParam(event, 'id') ?? ''
  const targetUserId = getRouterParam(event, 'userId') ?? ''
  const service = serverSupabaseServiceRole(event)

  await assertOwner(service, leagueId, user.id)

  if (targetUserId === user.id) {
    throw createError({ statusCode: 400, data: { code: 'CANNOT_REMOVE_OWNER', message: 'Owner cannot be removed from the league' } })
  }

  const { error } = await service
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', targetUserId)

  if (error) throw createError({ statusCode: 500, data: { code: 'DELETE_FAILED', message: error.message } })
  return { ok: true }
})
