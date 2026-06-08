import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ leagueId?: string; email?: string }>(event)

  if (!body?.leagueId || !body?.email) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_BODY', message: 'leagueId and email are required' } })
  }

  const { leagueId, email } = body
  const service = serverSupabaseServiceRole(event)

  await assertMember(service, leagueId, user.id)

  // Check if email is already a member
  const { data: profileWithEmail } = await service
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (profileWithEmail) {
    const { data: existingMember } = await service
      .from('league_members')
      .select('id')
      .eq('league_id', leagueId)
      .eq('user_id', profileWithEmail.id)
      .maybeSingle()
    if (existingMember) {
      return { ok: true, invitationId: null, alreadyMember: true }
    }
  }

  // Check for existing pending invitation
  const { data: existingInvite } = await service
    .from('invitations')
    .select('id')
    .eq('league_id', leagueId)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .maybeSingle()

  if (existingInvite) {
    throw createError({ statusCode: 409, data: { code: 'ALREADY_INVITED', message: 'A pending invitation already exists for this email' } })
  }

  const { data: invitation, error: insertError } = await service
    .from('invitations')
    .insert({ league_id: leagueId, email: email.toLowerCase(), invited_by: user.id })
    .select('id, token')
    .single()

  if (insertError || !invitation) {
    throw createError({ statusCode: 500, data: { code: 'INSERT_FAILED', message: 'Failed to create invitation' } })
  }

  const { data: league } = await service.from('leagues').select('name').eq('id', leagueId).single()
  const { data: inviterProfile } = await service.from('profiles').select('first_name, last_name, nickname').eq('id', user.id).single()

  const inviterName = (inviterProfile?.nickname
    ?? [inviterProfile?.first_name, inviterProfile?.last_name].filter(Boolean).join(' '))
    || 'A friend'

  const config = useRuntimeConfig(event)
  const baseUrl = config.public.siteUrl || getRequestURL(event).origin
  const inviteUrl = `${baseUrl}/invite/${invitation.token}`

  await sendInvitationEmail(event, {
    to: email,
    leagueName: league?.name ?? 'NFL Picks League',
    inviteUrl,
    inviterName,
  })

  return { ok: true, invitationId: invitation.id, alreadyMember: false }
})
