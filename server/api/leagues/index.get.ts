import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const service = serverSupabaseServiceRole(event)

  const { data: memberRows, error } = await service
    .from('league_members')
    .select('role, leagues(id, name, season_year, photo_url, created_by, created_at)')
    .eq('user_id', user.id)

  if (error) throw createError({ statusCode: 500, data: { code: 'FETCH_FAILED', message: error.message } })

  type RawRow = {
    role: 'owner' | 'member'
    leagues: { id: string; name: string; season_year: number; photo_url: string | null; created_by: string; created_at: string }
  }
  const rows = (memberRows ?? []) as RawRow[]
  const leagueIds = rows.map((r) => r.leagues.id)

  let countMap: Record<string, number> = {}
  if (leagueIds.length > 0) {
    const { data: countRows } = await service
      .from('league_members')
      .select('league_id')
      .in('league_id', leagueIds)
    for (const row of (countRows ?? []) as { league_id: string }[]) {
      countMap[row.league_id] = (countMap[row.league_id] ?? 0) + 1
    }
  }

  return rows.map((r) => ({
    ...r.leagues,
    memberCount: countMap[r.leagues.id] ?? 1,
    role: r.role,
  }))
})
