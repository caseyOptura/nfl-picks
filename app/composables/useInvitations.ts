export interface PendingInvitation {
  id: string
  email: string
  created_at: string
}

export function useInvitations(leagueId: MaybeRefOrGetter<string>) {
  const invitations = ref<PendingInvitation[]>([])
  const pending = ref(false)

  async function refresh() {
    const id = toValue(leagueId)
    if (!id) return
    pending.value = true
    try {
      invitations.value = await authFetch<PendingInvitation[]>(`/api/invitations?leagueId=${id}`)
    } catch {
      invitations.value = []
    } finally {
      pending.value = false
    }
  }

  watch(() => toValue(leagueId), refresh, { immediate: true })

  const sending = ref(false)

  async function invite(email: string): Promise<{
    ok: boolean
    alreadyMember: boolean
    error: string | null
  }> {
    sending.value = true
    try {
      const data = await authFetch<{ ok: boolean; invitationId: string | null; alreadyMember: boolean }>(
        '/api/invitations',
        { method: 'POST', body: { leagueId: toValue(leagueId), email } }
      )
      if (!data.alreadyMember) await refresh()
      return { ok: true, alreadyMember: data.alreadyMember, error: null }
    } catch (e: unknown) {
      const err = e as { data?: { data?: { message?: string }; message?: string }; message?: string }
      const message = err?.data?.data?.message ?? err?.data?.message ?? err?.message ?? 'Failed to send invitation'
      return { ok: false, alreadyMember: false, error: message }
    } finally {
      sending.value = false
    }
  }

  async function resend(invitationId: string): Promise<{ ok: boolean; error: string | null }> {
    try {
      await authFetch('/api/invitations/resend', { method: 'POST', body: { invitationId, leagueId: toValue(leagueId) } })
      return { ok: true, error: null }
    } catch (e: unknown) {
      const err = e as { data?: { data?: { message?: string }; message?: string }; message?: string }
      const message = err?.data?.data?.message ?? err?.data?.message ?? err?.message ?? 'Failed to resend'
      return { ok: false, error: message }
    }
  }

  return { invitations, pending, sending, refresh, invite, resend }
}
