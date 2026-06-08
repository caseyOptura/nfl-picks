import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const leagueId = getRouterParam(event, 'id') ?? ''
  const service = serverSupabaseServiceRole(event)

  await assertMember(service, leagueId, user.id)

  const [{ data: leagueData, error: leagueError }, { data: memberRows, error: memberError }] = await Promise.all([
    service.from('leagues').select('*').eq('id', leagueId).maybeSingle(),
    service.from('league_members').select('user_id, role').eq('league_id', leagueId),
  ])

  if (leagueError) throw createError({ statusCode: 500, data: { code: 'FETCH_FAILED', message: leagueError.message } })
  if (!leagueData) throw createError({ statusCode: 404, data: { code: 'NOT_FOUND', message: 'League not found' } })
  if (memberError) throw createError({ statusCode: 500, data: { code: 'FETCH_FAILED', message: memberError.message } })

  const rows = (memberRows ?? []) as { user_id: string; role: 'owner' | 'member' }[]
  const userIds = rows.map((r) => r.user_id)

  let profileMap: Map<string, { nickname: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }> = new Map()
  if (userIds.length > 0) {
    const { data: profileRows } = await service
      .from('profiles')
      .select('id, nickname, first_name, last_name, avatar_url')
      .in('id', userIds)
    for (const p of (profileRows ?? []) as { id: string; nickname: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null }[]) {
      profileMap.set(p.id, p)
    }
  }

  const members = rows.map((m) => {
    const p = profileMap.get(m.user_id)
    const fullName = [p?.first_name, p?.last_name].filter(Boolean).join(' ')
    return {
      userId: m.user_id,
      displayName: p?.nickname || fullName || 'Member',
      avatarUrl: p?.avatar_url ?? null,
      role: m.role,
    }
  })

  return { league: leagueData, members }
})
