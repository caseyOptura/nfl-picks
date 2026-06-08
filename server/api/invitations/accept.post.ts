import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ token?: string }>(event)

  if (!body?.token) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_BODY', message: 'token is required' } })
  }

  const service = serverSupabaseServiceRole(event)

  const { data: invitation } = await service
    .from('invitations')
    .select('id, league_id, email, status')
    .eq('token', body.token)
    .maybeSingle()

  if (!invitation) {
    throw createError({ statusCode: 404, data: { code: 'NOT_FOUND', message: 'Invitation not found' } })
  }

  if (invitation.status !== 'pending') {
    throw createError({ statusCode: 410, data: { code: 'INVITATION_EXPIRED', message: 'Invitation has already been accepted or revoked' } })
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw createError({ statusCode: 403, data: { code: 'EMAIL_MISMATCH', message: 'This invitation was sent to a different email address' } })
  }

  await service
    .from('league_members')
    .upsert({ league_id: invitation.league_id, user_id: user.id, role: 'member' }, { onConflict: 'league_id,user_id', ignoreDuplicates: true })

  await service
    .from('invitations')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { ok: true, leagueId: invitation.league_id }
})
