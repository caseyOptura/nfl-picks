<script setup lang="ts">
const { requestPasswordReset } = useAuth()

const email = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const submitted = ref(false)

async function handleSubmit() {
  loading.value = true
  error.value = null
  const result = await requestPasswordReset(email.value)
  loading.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  submitted.value = true
}
</script>

<template>
  <main class="auth-page">
    <template v-if="submitted">
      <h1 class="page-title">Email sent</h1>
      <p class="sent-message">
        If that email is registered, a password reset link is on its way.
        Check your spam folder if you don't see it.
      </p>
      <div class="auth-links">
        <NuxtLink to="/login">Back to log in</NuxtLink>
      </div>
    </template>

    <template v-else>
      <h1 class="page-title">Forgot Password</h1>
      <form class="reset-form" @submit.prevent="handleSubmit">
        <FormField label="Email">
          <input
            v-model="email"
            type="email"
            class="input"
            autocomplete="email"
            required
          />
        </FormField>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send Reset Link' }}
        </button>
      </form>
      <div class="auth-links">
        <NuxtLink to="/login">Back to log in</NuxtLink>
      </div>
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

.reset-form {
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

.sent-message {
  color: #aaa;
  font-size: 0.95rem;
  line-height: 1.6;
  text-align: center;
}

.auth-links {
  display: flex;
  flex-direction: column;
  align-items: center;
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
