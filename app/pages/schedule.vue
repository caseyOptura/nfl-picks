<script setup lang="ts">
const { gamesByWeek, pending, error, refresh } = useScheduleGames()
</script>

<template>
  <main>
    <h1>2025 NFL Schedule</h1>
    <LoadingState v-if="pending" message="Loading schedule…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <EmptyState v-else-if="gamesByWeek.length === 0" message="No games found" />
    <template v-else>
      <ScheduleWeekSection
        v-for="{ week, games } in gamesByWeek"
        :key="week"
        :week="week"
        :games="games"
      />
    </template>
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
</style>
