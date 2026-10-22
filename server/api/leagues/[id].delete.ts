import { serverSupabaseServiceRole } from '#supabase/server'

const PHOTO_BUCKET = 'league-photos'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const leagueId = getRouterParam(event, 'id') ?? ''
  const service = serverSupabaseServiceRole(event)

  await assertOwner(service, leagueId, user.id)

  // Every league-scoped table (league_members, picks, invitations, chat_*)
  // references leagues(id) on delete cascade, so this one delete clears the
  // league's rows and nothing belonging to other leagues.
  const { error } = await service.from('leagues').delete().eq('id', leagueId)
  if (error) throw createError({ statusCode: 500, data: { code: 'DELETE_FAILED', message: error.message } })

  // Storage objects aren't covered by the cascade. Photos live under
  // `{leagueId}/`; a failure here only orphans a file, so don't fail the request.
  const { data: files } = await service.storage.from(PHOTO_BUCKET).list(leagueId)
  if (files?.length) {
    const { error: storageError } = await service.storage
      .from(PHOTO_BUCKET)
      .remove(files.map((f) => `${leagueId}/${f.name}`))
    if (storageError) console.error(`[leagues] failed to remove photos for ${leagueId}:`, storageError.message)
  }

  return { ok: true }
})
