export function useAcceptInvite() {
  const accepting = ref(false)

  async function accept(token: string): Promise<{
    ok: boolean
    leagueId: string | null
    error: string | null
  }> {
    accepting.value = true
    try {
      const data = await authFetch<{ ok: boolean; leagueId: string }>(
        '/api/invitations/accept',
        {
          method: 'POST',
          body: { token },
        }
      )
      return { ok: true, leagueId: data.leagueId, error: null }
    } catch (e: unknown) {
      const err = e as { data?: { data?: { message?: string }; message?: string }; message?: string }
      const message =
        err?.data?.data?.message ?? err?.data?.message ?? err?.message ?? 'Failed to accept invitation'
      return { ok: false, leagueId: null, error: message }
    } finally {
      accepting.value = false
    }
  }

  return { accepting, accept }
}
