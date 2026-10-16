import { serverSupabaseServiceRole } from '#supabase/server'
import { fetchGame } from '../../utils/espn'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ leagueId?: string; gameId?: string; pickedTeamId?: string }>(event)

  if (!body?.leagueId || !body?.gameId || !body?.pickedTeamId) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_BODY', message: 'leagueId, gameId, and pickedTeamId are required' } })
  }

  const { leagueId, gameId, pickedTeamId } = body
  if (!/^\d+$/.test(gameId)) {
    throw createError({ statusCode: 400, data: { code: 'GAME_NOT_FOUND', message: 'Game not found in schedule' } })
  }
  const service = serverSupabaseServiceRole(event)

  await assertMember(service, leagueId, user.id)

  // Validate the game and check lock status against just this one game. This
  // used to load the whole two-season schedule (~7 MB from ESPN, uncached) on
  // every pick, which is what pushed the worker past its resource limits.
  const game = await fetchGame(gameId)

  if (!game) {
    throw createError({ statusCode: 400, data: { code: 'GAME_NOT_FOUND', message: 'Game not found in schedule' } })
  }

  if (!game.teamIds.includes(pickedTeamId)) {
    throw createError({ statusCode: 400, data: { code: 'INVALID_TEAM', message: 'Picked team is not in this game' } })
  }

  const isFinal = game.statusName === 'STATUS_FINAL'
  const isInProgress = game.statusName === 'STATUS_IN_PROGRESS'
  const kickoffPassed = new Date(game.date) <= new Date()

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
