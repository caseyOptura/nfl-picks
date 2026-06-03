<script setup lang="ts">
const route = useRoute()
const teamId = route.params.id as string
const { team, completedGames, upcomingGames, pending, error, refresh } = useTeamSchedule(teamId)
const { positionGroups, pending: rosterPending, error: rosterError, refresh: rosterRefresh } = useTeamRoster(teamId)

const TABS = ['Schedule', 'Stats', 'Roster'] as const
type Tab = typeof TABS[number]
const activeTab = ref<Tab>('Schedule')

function setTab(tab: string) {
  if (TABS.includes(tab as Tab)) activeTab.value = tab as Tab
}
</script>

<template>
  <main>
    <LoadingState v-if="pending" message="Loading team…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <template v-else-if="team">
      <TeamHeader :team="team" />
      <TabBar :tabs="['Schedule', 'Stats', 'Roster']" :active="activeTab" @change="setTab" />

      <template v-if="activeTab === 'Schedule'">
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
      </template>

      <template v-else-if="activeTab === 'Stats'">
        <TeamStatsPanel :team="team" :team-id="teamId" :completed-games="completedGames" />
      </template>

      <template v-else-if="activeTab === 'Roster'">
        <LoadingState v-if="rosterPending" message="Loading roster…" />
        <ErrorState v-else-if="rosterError" :message="rosterError.message" @retry="rosterRefresh" />
        <EmptyState v-else-if="positionGroups.length === 0" message="No roster available" />
        <RosterPanel v-else :groups="positionGroups" />
      </template>
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
</style>
