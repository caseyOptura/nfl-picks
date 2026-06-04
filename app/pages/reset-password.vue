<script setup lang="ts">
const { resetPassword } = useAuth()
const client = useSupabaseClient()
const route = useRoute()

const sessionReady = ref(false)
const sessionError = ref<string | null>(null)
const newPassword = ref('')
const confirmPassword = ref('')
const mismatch = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

onMounted(async () => {
  const code = route.query.code as string | undefined
  if (code) {
    // PKCE flow: exchange the code from the URL for a recovery session
    const { error: exchangeError } = await client.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      sessionError.value = 'This reset link has expired or already been used. Please request a new one.'
      return
    }
  }
  const { data: { session } } = await client.auth.getSession()
  if (session) {
    sessionReady.value = true
  } else {
    sessionError.value = 'Invalid or expired reset link. Please request a new one.'
  }
})

watch([newPassword, confirmPassword], () => { mismatch.value = false })

async function handleSubmit() {
  if (newPassword.value !== confirmPassword.value) {
    mismatch.value = true
    return
  }
  loading.value = true
  error.value = null
  const result = await resetPassword(newPassword.value)
  loading.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  success.value = true
  setTimeout(() => navigateTo('/profile'), 1500)
}
</script>

<template>
  <main class="auth-page">
    <h1 class="page-title">Set New Password</h1>

    <template v-if="sessionError">
      <p class="form-error">{{ sessionError }}</p>
      <div class="auth-links">
        <NuxtLink to="/forgot-password">Request a new reset link</NuxtLink>
      </div>
    </template>

    <template v-else-if="success">
      <p class="success-message">Password updated! Redirecting…</p>
    </template>

    <template v-else-if="sessionReady">
      <form class="pw-form" @submit.prevent="handleSubmit">
        <FormField label="New Password">
          <input
            v-model="newPassword"
            type="password"
            class="input"
            autocomplete="new-password"
            required
          />
        </FormField>

        <FormField label="Confirm New Password" :error="mismatch ? 'Passwords do not match' : undefined">
          <input
            v-model="confirmPassword"
            type="password"
            class="input"
            autocomplete="new-password"
            required
          />
        </FormField>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button
          type="submit"
          class="submit-btn"
          :disabled="loading || mismatch || !newPassword || !confirmPassword"
        >
          {{ loading ? 'Saving…' : 'Set Password' }}
        </button>
      </form>
    </template>

    <template v-else>
      <LoadingState message="Verifying reset link…" />
    </template>
  </main>
</template>

<style scoped>
.auth-page {
  max-width: 420px;
  margin: 3rem auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  text-align: center;
}

.pw-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  background: #111;
  border: 1px solid #333;
  border-radius: 6px;
  color: #f0f0f0;
  font-size: 0.95rem;
}

.input:focus {
  outline: none;
  border-color: #555;
}

.form-error {
  font-size: 0.85rem;
  color: #f87171;
  text-align: center;
}

.submit-btn {
  padding: 0.7rem;
  background: #fff;
  color: #0a0a0a;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-message {
  text-align: center;
  color: #4ade80;
  font-size: 0.95rem;
}

.auth-links {
  display: flex;
  justify-content: center;
}

.auth-links a {
  color: #888;
  text-decoration: none;
  font-size: 0.875rem;
}

.auth-links a:hover {
  color: #ccc;
}
</style>
