import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ name?: string; season_year?: number }>(event)

  if (!body?.name?.trim() || !body?.season_year) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_BODY', message: 'name and season_year are required' } })
  }

  const service = serverSupabaseServiceRole(event)
  const { data, error } = await service
    .from('leagues')
    .insert({ name: body.name.trim(), season_year: body.season_year, created_by: user.id })
    .select('id')
    .single()

  if (error) throw createError({ statusCode: 500, data: { code: 'INSERT_FAILED', message: error.message } })
  return { ok: true, id: (data as { id: string }).id }
})
