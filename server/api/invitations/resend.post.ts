import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ invitationId?: string; leagueId?: string }>(event)

  if (!body?.invitationId || !body?.leagueId) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_BODY', message: 'invitationId and leagueId are required' } })
  }

  const service = serverSupabaseServiceRole(event)

  await assertMember(service, body.leagueId, user.id)

  const { data: invitation } = await service
    .from('invitations')
    .select('id, league_id, email, token, status')
    .eq('id', body.invitationId)
    .eq('league_id', body.leagueId)
    .maybeSingle()

  if (!invitation) {
    throw createError({ statusCode: 404, data: { code: 'NOT_FOUND', message: 'Invitation not found' } })
  }

  if (invitation.status !== 'pending') {
    throw createError({ statusCode: 410, data: { code: 'NOT_PENDING', message: 'Invitation is no longer pending' } })
  }

  const [{ data: league }, { data: inviterProfile }] = await Promise.all([
    service.from('leagues').select('name').eq('id', invitation.league_id).single(),
    service.from('profiles').select('first_name, last_name, nickname').eq('id', user.id).single(),
  ])

  const inviterName =
    (inviterProfile?.nickname ?? [inviterProfile?.first_name, inviterProfile?.last_name].filter(Boolean).join(' ')) ||
    'A friend'

  const config = useRuntimeConfig(event)
  const baseUrl = config.public.siteUrl || getRequestURL(event).origin
  const inviteUrl = `${baseUrl}/invite/${invitation.token}`

  await sendInvitationEmail(event, {
    to: invitation.email,
    leagueName: league?.name ?? 'NFL Picks League',
    inviteUrl,
    inviterName,
  })

  return { ok: true }
})
