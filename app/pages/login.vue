<script setup lang="ts">
const route = useRoute()
const { logIn } = useAuth()

const loading = ref(false)
const error = ref<string | null>(null)

async function handleSubmit({ email, password }: { email: string; password: string }) {
  loading.value = true
  error.value = null
  const result = await logIn(email, password)
  loading.value = false
  if (!result.ok) {
    error.value = result.error || 'Login failed. Please try again.'
    return
  }
  const redirect = route.query.redirect as string | undefined
  navigateTo(redirect || '/profile')
}
</script>

<template>
  <main class="auth-page">
    <h1 class="page-title">Log In</h1>
    <AuthForm submit-label="Log In" :loading="loading" :error="error" @submit="handleSubmit" />
    <div class="auth-links">
      <NuxtLink :to="route.query.redirect ? `/signup?redirect=${encodeURIComponent(route.query.redirect as string)}` : '/signup'">Don't have an account? Sign up</NuxtLink>
      <NuxtLink to="/forgot-password">Forgot password?</NuxtLink>
    </div>
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

.auth-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
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
