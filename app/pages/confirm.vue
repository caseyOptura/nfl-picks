<script setup lang="ts">
const client = useSupabaseClient()
const session = useSupabaseSession()
const route = useRoute()

const timedOut = ref(false)

const errorDescription = computed(() =>
  route.query.error_description as string | undefined
)

onMounted(async () => {
  const code = route.query.code as string | undefined
  if (code) {
    // PKCE flow: exchange the confirmation code for a session
    await client.auth.exchangeCodeForSession(code)
  }
})

// Redirect once the session is established — honor ?redirect= if present (e.g. invite flow)
const redirectTarget = computed(() => (route.query.redirect as string | undefined) || '/profile')
watch(session, (s) => {
  if (s) navigateTo(redirectTarget.value)
}, { immediate: true })

// Show a fallback link if confirmation takes too long
setTimeout(() => { timedOut.value = true }, 15000)
</script>

<template>
  <main class="confirm-page">
    <template v-if="errorDescription">
      <h1 class="page-title">Confirmation failed</h1>
      <p class="error-message">{{ errorDescription }}</p>
      <NuxtLink to="/login" class="fallback-link">Try logging in</NuxtLink>
    </template>

    <template v-else-if="timedOut">
      <h1 class="page-title">Taking longer than expected</h1>
      <p class="muted">Your session may already be active.</p>
      <NuxtLink to="/login" class="fallback-link">Go to log in</NuxtLink>
    </template>

    <template v-else>
      <LoadingState message="Confirming your email…" />
    </template>
  </main>
</template>

<style scoped>
.confirm-page {
  max-width: 420px;
  margin: 4rem auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
}

.page-title {
  text-align: center;
}

.error-message {
  color: #f87171;
  font-size: 0.95rem;
}

.muted {
  color: #888;
  font-size: 0.9rem;
}

.fallback-link {
  color: #888;
  text-decoration: none;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.fallback-link:hover {
  color: #ccc;
}
</style>
