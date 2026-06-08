<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { leagues, pending, error, refresh } = useLeagues()

const showModal = ref(false)

function handleCreated(id: string) {
  showModal.value = false
  navigateTo('/leagues/' + id)
}
</script>

<template>
  <main class="leagues-page">
    <div class="page-header">
      <h1>Your Leagues</h1>
      <button class="btn-create" @click="showModal = true">+ Create League</button>
    </div>

    <LoadingState v-if="pending" message="Loading leagues…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <EmptyState v-else-if="leagues.length === 0" message="You're not in any leagues yet." />

    <div v-else class="leagues-grid">
      <LeagueCard v-for="league in leagues" :key="league.id" :league="league" />
    </div>

    <CreateLeagueModal :open="showModal" @close="showModal = false" @created="handleCreated" />
  </main>
</template>

<style scoped>
.leagues-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-header h1 {
  margin-bottom: 0;
}

.btn-create {
  padding: 0.5rem 1rem;
  background: #fff;
  border: none;
  border-radius: 7px;
  color: #0a0a0a;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.btn-create:hover {
  opacity: 0.88;
}

.leagues-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
