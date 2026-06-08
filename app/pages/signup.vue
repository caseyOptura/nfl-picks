<script setup lang="ts">
import { randomNickname } from '~/composables/funnyNicknames'

const route = useRoute()
const { signUp } = useAuth()
const redirectAfterConfirm = computed(() => route.query.redirect as string | undefined)

const firstName = ref('')
const lastName = ref('')
const nickname = ref(randomNickname())
const email = ref('')
const password = ref('')

const loading = ref(false)
const error = ref<string | null>(null)
const confirmedEmail = ref<string | null>(null)

function shuffleNickname() {
  nickname.value = randomNickname(firstName.value || null)
}

async function handleSubmit() {
  loading.value = true
  error.value = null
  const result = await signUp(email.value, password.value, {
    first_name: firstName.value,
    last_name: lastName.value,
    nickname: nickname.value,
  }, redirectAfterConfirm.value)
  loading.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  confirmedEmail.value = email.value
}
</script>

<template>
  <main class="auth-page">
    <template v-if="confirmedEmail">
      <h1 class="page-title">Check your inbox</h1>
      <p class="confirm-message">
        We sent a confirmation link to <strong>{{ confirmedEmail }}</strong>.
        Click the link in that email to activate your account{{ redirectAfterConfirm ? ' and join your league' : '' }}.
      </p>
      <div class="auth-links">
        <NuxtLink to="/login">Back to log in</NuxtLink>
      </div>
    </template>

    <template v-else>
      <h1 class="page-title">Sign Up</h1>

      <form class="signup-form" @submit.prevent="handleSubmit">
        <div class="name-row">
          <FormField label="First Name">
            <input
              v-model="firstName"
              type="text"
              class="input"
              autocomplete="given-name"
              required
            />
          </FormField>
          <FormField label="Last Name">
            <input
              v-model="lastName"
              type="text"
              class="input"
              autocomplete="family-name"
              required
            />
          </FormField>
        </div>

        <FormField label="Nickname">
          <div class="nickname-row">
            <input
              v-model="nickname"
              type="text"
              class="input"
              required
            />
            <button type="button" class="shuffle-btn" @click="shuffleNickname">Shuffle</button>
          </div>
        </FormField>

        <FormField label="Email">
          <input
            v-model="email"
            type="email"
            class="input"
            autocomplete="email"
            required
          />
        </FormField>

        <FormField label="Password">
          <input
            v-model="password"
            type="password"
            class="input"
            autocomplete="new-password"
            required
          />
        </FormField>

        <p v-if="error" class="form-error">{{ error }}</p>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Sign Up' }}
        </button>
      </form>

      <div class="auth-links">
        <NuxtLink to="/login">Already have an account? Log in</NuxtLink>
      </div>
    </template>
  </main>
</template>

<style scoped>
.auth-page {
  max-width: 420px; margin: 3rem auto; padding: 0 1rem;
  display: flex; flex-direction: column; gap: 1.5rem;
}
.page-title { text-align: center; }
.signup-form { display: flex; flex-direction: column; gap: 1rem; }
.name-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.nickname-row { display: flex; gap: 0.5rem; }

.input {
  width: 100%; padding: 0.65rem 0.75rem; background: #111;
  border: 1px solid #333; border-radius: 6px; color: #f0f0f0; font-size: 0.95rem;
}
.input:focus { outline: none; border-color: #555; }

.shuffle-btn {
  padding: 0.65rem 0.75rem; background: #222; border: 1px solid #333;
  border-radius: 6px; color: #ccc; font-size: 0.85rem; cursor: pointer;
  white-space: nowrap; flex-shrink: 0;
}
.shuffle-btn:hover { background: #2a2a2a; }

.form-error { font-size: 0.85rem; color: #f87171; }

.submit-btn {
  padding: 0.7rem; background: #fff; color: #0a0a0a; border: none;
  border-radius: 6px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
}
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.confirm-message { color: #aaa; font-size: 0.95rem; line-height: 1.6; text-align: center; }
.confirm-message strong { color: #f0f0f0; }

.auth-links { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.auth-links a { color: #888; text-decoration: none; font-size: 0.875rem; }
.auth-links a:hover { color: #ccc; }
</style>
