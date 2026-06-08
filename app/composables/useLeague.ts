import type { LeagueRow, MemberView } from '~/types/picks'

export function useLeague(leagueId: MaybeRefOrGetter<string>) {
  const { userId } = useAuth()

  const league = ref<LeagueRow | null>(null)
  const members = ref<MemberView[]>([])
  const pending = ref(false)
  const error = ref<Error | null>(null)

  const isOwner = computed(() => !!league.value && league.value.created_by === userId.value)

  async function refresh() {
    const id = toValue(leagueId)
    if (!id) return
    pending.value = true
    error.value = null
    try {
      const data = await authFetch<{ league: LeagueRow; members: MemberView[] }>(`/api/leagues/${id}`)
      league.value = data.league
      members.value = data.members
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
    }
  }

  watch(() => toValue(leagueId), refresh, { immediate: true })

  async function updateLeague(patch: {
    name?: string
    season_year?: number
    photo_url?: string
  }): Promise<{ ok: boolean; error: string | null }> {
    const id = toValue(leagueId)
    if (!id) return { ok: false, error: 'No league id' }
    try {
      await authFetch(`/api/leagues/${id}`, { method: 'PATCH', body: patch })
      await refresh()
      return { ok: true, error: null }
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to update league'
      return { ok: false, error: msg }
    }
  }

  async function removeMember(targetUserId: string): Promise<{ ok: boolean; error: string | null }> {
    const id = toValue(leagueId)
    if (!id) return { ok: false, error: 'No league id' }
    try {
      await authFetch(`/api/leagues/${id}/members/${targetUserId}`, { method: 'DELETE' })
      await refresh()
      return { ok: true, error: null }
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message ?? 'Failed to remove member'
      return { ok: false, error: msg }
    }
  }

  async function uploadPhoto(file: File): Promise<{ url: string | null; error: string | null }> {
    const client = useSupabaseClient()
    const id = toValue(leagueId)
    if (!file.type.startsWith('image/')) return { url: null, error: 'File must be an image' }
    if (file.size > 10 * 1024 * 1024) return { url: null, error: 'File must be under 10 MB' }
    if (!id) return { url: null, error: 'No league id' }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${id}/photo.${ext}`

    const { error: uploadError } = await client.storage
      .from('league-photos')
      .upload(path, file, { upsert: true })
    if (uploadError) return { url: null, error: uploadError.message }

    const { data } = client.storage.from('league-photos').getPublicUrl(path)
    const url = data.publicUrl
    await updateLeague({ photo_url: url })
    return { url, error: null }
  }

  return { league, members, isOwner, pending, error, refresh, updateLeague, removeMember, uploadPhoto }
}
