import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const leagueId = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ name?: string; season_year?: number; photo_url?: string }>(event)
  const service = serverSupabaseServiceRole(event)

  await assertOwner(service, leagueId, user.id)

  const patch: Record<string, unknown> = {}
  if (body?.name !== undefined) patch.name = body.name.trim()
  if (body?.season_year !== undefined) patch.season_year = body.season_year
  if (body?.photo_url !== undefined) patch.photo_url = body.photo_url

  if (Object.keys(patch).length === 0) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_BODY', message: 'Nothing to update' } })
  }

  const { error } = await service.from('leagues').update(patch).eq('id', leagueId)
  if (error) throw createError({ statusCode: 500, data: { code: 'UPDATE_FAILED', message: error.message } })
  return { ok: true }
})
