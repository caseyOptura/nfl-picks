import type { ProfileRow, ProfileUpdate } from '~/types/auth'

export function useProfile() {
  const client = useSupabaseClient()
  const { userId } = useAuth()

  const profile = ref<ProfileRow | null>(null)
  const pending = ref(false)
  const error = ref<Error | null>(null)

  async function fetchProfile() {
    if (!userId.value) {
      profile.value = null
      return
    }
    pending.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId.value)
        .maybeSingle()
      if (fetchError) throw new Error(fetchError.message)
      profile.value = data as ProfileRow | null
    } catch (e) {
      error.value = e as Error
    } finally {
      pending.value = false
    }
  }

  watch(userId, fetchProfile, { immediate: true })

  async function updateProfile(patch: ProfileUpdate): Promise<{ ok: boolean; error: string | null }> {
    if (!userId.value) return { ok: false, error: 'Not logged in' }
    const { error: updateError } = await client
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', userId.value)
    if (updateError) return { ok: false, error: updateError.message }
    await fetchProfile()
    return { ok: true, error: null }
  }

  return { profile, pending, error, refresh: fetchProfile, updateProfile }
}
