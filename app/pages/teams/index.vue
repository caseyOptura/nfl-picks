<script setup lang="ts">
const { teams, pending, error, refresh } = useTeams()
</script>

<template>
  <main>
    <h1>NFL Teams</h1>
    <LoadingState v-if="pending" message="Loading teams…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <EmptyState v-else-if="teams.length === 0" message="No teams found" />
    <div v-else class="teams-grid">
      <TeamCard v-for="team in teams" :key="team.id" :team="team" />
    </div>
  </main>
</template>

<style scoped>
main {
  padding: 1rem;
  max-width: 960px;
  margin: 0 auto;
}

h1 {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  color: #f0f0f0;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
}
</style>
