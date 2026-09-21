import type { AuthResult } from '~/types/auth'

// Supabase treats the address as given. Trim and lowercase at the boundary so a
// stray space or a capitalised address can never register as a second account.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

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
    profile: { first_name: string; last_name: string; nickname: string },
    redirectAfterConfirm?: string
  ): Promise<AuthResult> {
    const confirmUrl = new URL(window.location.origin + '/confirm')
    if (redirectAfterConfirm) confirmUrl.searchParams.set('redirect', redirectAfterConfirm)
    const { data, error } = await client.auth.signUp({
      email: normalizeEmail(email),
      password,
      options: {
        emailRedirectTo: confirmUrl.toString(),
        data: profile,
      },
    })
    if (error) {
      // Supabase reports an already-registered address this way when email
      // confirmation is disabled; with it enabled we fall through to the
      // identities check below.
      if (/already registered|already been registered/i.test(error.message)) {
        return { ok: false, error: 'An account with this email already exists.', emailTaken: true }
      }
      return { ok: false, error: error.message }
    }
    if (data.user?.identities?.length === 0) {
      return { ok: false, error: 'An account with this email already exists.', emailTaken: true }
    }
    return { ok: true, error: null }
  }

  async function logIn(email: string, password: string): Promise<AuthResult> {
    const { error } = await client.auth.signInWithPassword({ email: normalizeEmail(email), password })
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
    const { error } = await client.auth.resetPasswordForEmail(normalizeEmail(email), {
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
