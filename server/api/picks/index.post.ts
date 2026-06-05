export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ leagueId?: string; gameId?: string; pickedTeamId?: string }>(event)

  if (!body?.leagueId || !body?.gameId || !body?.pickedTeamId) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_BODY', message: 'leagueId, gameId, and pickedTeamId are required' } })
  }

  const { leagueId, gameId, pickedTeamId } = body
  const service = serverSupabaseServiceRole(event)

  await assertMember(service, leagueId, user.id)

  // Fetch schedule to validate game and check lock status
  const schedule = await $fetch<{ events: Array<{
    id: string
    date: string
    status: { type: { name: string } }
    competitions: Array<{ competitors: Array<{ homeAway: string; team: { id: string } }> }>
  }> }>('/api/schedule', { baseURL: getRequestURL(event).origin })

  const espnEvent = (schedule.events ?? []).find(e => e.id === gameId)

  if (!espnEvent) {
    throw createError({ statusCode: 400, data: { code: 'GAME_NOT_FOUND', message: 'Game not found in schedule' } })
  }

  const comp = espnEvent.competitions[0]
  const teamIds = comp.competitors.map(c => c.team.id)
  if (!teamIds.includes(pickedTeamId)) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_TEAM', message: 'Picked team is not in this game' } })
  }

  const statusName = espnEvent.status.type.name
  const isFinal = statusName === 'STATUS_FINAL'
  const isInProgress = statusName === 'STATUS_IN_PROGRESS'
  const kickoffPassed = new Date(espnEvent.date) <= new Date()

  if (isFinal || isInProgress || kickoffPassed) {
    throw createError({ statusCode: 423, data: { code: 'GAME_LOCKED', message: 'This game is locked and cannot be picked' } })
  }

  const { error: upsertError } = await service
    .from('picks')
    .upsert(
      { league_id: leagueId, user_id: user.id, game_id: gameId, picked_team_id: pickedTeamId, updated_at: new Date().toISOString() },
      { onConflict: 'league_id,user_id,game_id' }
    )

  if (upsertError) {
    throw createError({ statusCode: 500, data: { code: 'UPSERT_FAILED', message: upsertError.message } })
  }

  return { ok: true }
})
