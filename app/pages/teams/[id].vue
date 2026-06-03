<script setup lang="ts">
const route = useRoute()
const teamId = route.params.id as string
const { team, completedGames, upcomingGames, pending, error, refresh } = useTeamSchedule(teamId)
const { groups, pending: rosterPending, error: rosterError, refresh: rosterRefresh } = useTeamRoster(teamId)
const showRoster = ref(false)

function toggleRoster() {
  showRoster.value = !showRoster.value
}
</script>

<template>
  <main>
    <LoadingState v-if="pending" message="Loading team…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <template v-else-if="team">
      <TeamHeader :team="team" />
      <section class="games-section">
        <h2>Completed Games</h2>
        <EmptyState v-if="completedGames.length === 0" message="No completed games" />
        <GameRow v-for="game in completedGames" :key="game.id" :game="game" />
      </section>
      <section class="games-section">
        <h2>Upcoming Games</h2>
        <EmptyState v-if="upcomingGames.length === 0" message="No upcoming games" />
        <GameRow v-for="game in upcomingGames" :key="game.id" :game="game" />
      </section>
      <section class="roster-section">
        <button class="roster-toggle" @click="toggleRoster">
          {{ showRoster ? 'Hide Roster' : 'Show Roster' }}
        </button>
        <template v-if="showRoster">
          <LoadingState v-if="rosterPending" message="Loading roster…" />
          <ErrorState v-else-if="rosterError" :message="rosterError.message" @retry="rosterRefresh" />
          <EmptyState v-else-if="groups.length === 0" message="No roster available" />
          <RosterPanel v-else :groups="groups" />
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
main {
  padding: 1rem;
  max-width: 960px;
  margin: 0 auto;
}

h2 {
  font-size: 1rem;
  font-weight: 700;
  color: #ccc;
  margin-bottom: 0.5rem;
}

.games-section {
  margin-bottom: 2rem;
}

.roster-section {
  margin-top: 2rem;
}

.roster-toggle {
  padding: 0.5rem 1.25rem;
  background: #222;
  color: #fff;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}

.roster-toggle:hover {
  background: #333;
}
</style>
