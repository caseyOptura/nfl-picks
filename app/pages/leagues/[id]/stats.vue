<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const id = computed(() => route.params.id as string)

const { league, pending: leaguePending, error: leagueError } = useLeague(id)
const { entries, pending: lbPending, error: lbError, refresh } = useLeaderboard(id)

const pending = computed(() => leaguePending.value || lbPending.value)
const error = computed(() => leagueError.value ?? lbError.value)
</script>

<template>
  <main class="stats-page">
    <NuxtLink :to="'/leagues/' + id" class="back-link">← Back to league</NuxtLink>

    <div v-if="league" class="stats-header">
      <img
        v-if="league.photo_url"
        :src="league.photo_url"
        :alt="league.name"
        class="league-photo"
      />
      <div>
        <h1>{{ league.name }}</h1>
        <p class="subtitle">Standings</p>
      </div>
    </div>

    <LoadingState v-if="pending" message="Loading standings…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <EmptyState v-else-if="entries.length === 0" message="No picks yet — get your league picking!" />
    <LeaderboardTable v-else :entries="entries" />
  </main>
</template>

<style scoped>
.stats-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.back-link {
  color: #999;
  font-size: 0.875rem;
  text-decoration: none;
}

.back-link:hover {
  color: #f0f0f0;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.league-photo {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid #333;
  flex-shrink: 0;
}

.stats-header h1 {
  margin: 0 0 0.1rem;
}

.subtitle {
  color: #999;
  margin: 0;
  font-size: 0.85rem;
}
</style>
