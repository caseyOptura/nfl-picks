// Per-user quiet hours (user_notification_settings). The chat-push function
// skips push while a user is inside their window; toasts and badges are
// unaffected. Times are local to the saved timezone, which follows the
// browser each time the user saves.

export interface QuietHours {
  start: string // 'HH:MM'
  end: string
}

export const DEFAULT_QUIET_HOURS: QuietHours = { start: '23:00', end: '08:00' }

export function useQuietHours() {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const quiet = ref<QuietHours | null>(null)
  const loaded = ref(false)

  async function load() {
    if (!userId.value) return
    const { data } = await client
      .from('user_notification_settings')
      .select('quiet_start, quiet_end')
      .eq('user_id', userId.value)
      .maybeSingle()
    const row = data as { quiet_start: string | null, quiet_end: string | null } | null
    quiet.value = row?.quiet_start && row.quiet_end
      ? { start: row.quiet_start.slice(0, 5), end: row.quiet_end.slice(0, 5) }
      : null
    loaded.value = true
  }

  // null turns quiet hours off.
  async function save(next: QuietHours | null): Promise<string | null> {
    if (!userId.value) return null
    const before = quiet.value
    quiet.value = next
    const { error } = await client.from('user_notification_settings').upsert({
      user_id: userId.value,
      quiet_start: next?.start ?? null,
      quiet_end: next?.end ?? null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    } as never)
    if (!error) return null
    quiet.value = before
    return 'Couldn’t save quiet hours.'
  }

  return { quiet, loaded, load, save }
}
