import type { AuthResult } from '~/types/auth'

function claimFromToken(token: string, claim: string): string | null {
  try {
    return (JSON.parse(atob(token.split('.')[1])) as Record<string, string>)[claim] ?? null
  } catch {
    return null
  }
}

export function useAuth() {
  const client = useSupabaseClient()
  const session = useSupabaseSession()
  const isLoggedIn = computed(() => !!session.value)
  const userId = computed(() => session.value ? claimFromToken(session.value.access_token, 'sub') : null)
  const userEmail = computed(() => session.value ? claimFromToken(session.value.access_token, 'email') : null)

  async function signUp(
    email: string,
    password: string,
    profile: { first_name: string; last_name: string; nickname: string }
  ): Promise<AuthResult> {
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/confirm',
        data: profile,
      },
    })
    if (error) return { ok: false, error: error.message }
    if (data.user?.identities?.length === 0) {
      return { ok: false, error: 'An account with this email already exists.' }
    }
    return { ok: true, error: null }
  }

  async function logIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    return { ok: true, error: null }
  }

  async function logOut(): Promise<AuthResult> {
    const { error } = await client.auth.signOut()
    if (error) return { ok: false, error: error.message }
    await navigateTo('/login')
    return { ok: true, error: null }
  }

  async function requestPasswordReset(email: string): Promise<AuthResult> {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, error: null }
  }

  async function updatePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    if (!userEmail.value) return { ok: false, error: 'Unable to verify identity.' }
    const { error: signInError } = await client.auth.signInWithPassword({
      email: userEmail.value,
      password: currentPassword,
    })
    if (signInError) return { ok: false, error: 'Current password is incorrect.' }
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    return { ok: true, error: null }
  }

  async function resetPassword(newPassword: string): Promise<AuthResult> {
    const { error } = await client.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: error.message }
    return { ok: true, error: null }
  }

  return { session, userId, isLoggedIn, signUp, logIn, logOut, requestPasswordReset, updatePassword, resetPassword }
}
