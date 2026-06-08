<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { accepting, accept } = useAcceptInvite()

const leagueId = ref<string | null>(null)
const acceptError = ref<string | null>(null)

onMounted(async () => {
  const result = await accept(route.params.token as string)
  if (result.ok && result.leagueId) {
    navigateTo('/leagues/' + result.leagueId)
  } else {
    acceptError.value = result.error
  }
})
</script>

<template>
  <main class="invite-page">
    <LoadingState v-if="accepting" message="Joining league…" />
    <template v-else-if="acceptError">
      <ErrorState :message="acceptError" />
      <NuxtLink to="/leagues" class="back-link">Back to Leagues</NuxtLink>
    </template>
  </main>
</template>

<style scoped>
.invite-page {
  max-width: 480px;
  margin: 4rem auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
}

.back-link {
  font-size: 0.9rem;
  color: #999;
  text-decoration: none;
  border-bottom: 1px solid #333;
  padding-bottom: 1px;
  transition: color 0.15s;
}

.back-link:hover {
  color: #ccc;
}
</style>
