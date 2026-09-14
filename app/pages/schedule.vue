<script setup lang="ts">
import { currentSeasonYear } from '#shared/utils/season'

const { seasons, weekGroupsFor, playoffGroupsFor, pending, error, refresh } = useScheduleGames()

// Default to the newest season the payload carries.
const selectedSeason = ref(currentSeasonYear())
watch(seasons, (list) => {
  if (list.length && !list.includes(selectedSeason.value)) {
    selectedSeason.value = list[list.length - 1]!
  }
}, { immediate: true })

const activeWeeks = computed(() => weekGroupsFor(selectedSeason.value))
const activePlayoffs = computed(() => playoffGroupsFor(selectedSeason.value))
const hasContent = computed(() => activeWeeks.value.length > 0 || activePlayoffs.value.length > 0)
</script>

<template>
  <main>
    <div class="header-row">
      <h1>NFL Schedule</h1>
      <div class="tabs">
        <button
          v-for="year in seasons"
          :key="year"
          class="tab"
          :class="{ active: selectedSeason === year }"
          @click="selectedSeason = year"
        >{{ year }}</button>
      </div>
    </div>

    <LoadingState v-if="pending" message="Loading schedule…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <EmptyState v-else-if="!hasContent" message="No games found" />
    <template v-else>
      <ScheduleWeekSection
        v-for="{ week, games } in activeWeeks"
        :key="week"
        :week="week"
        :games="games"
      />

      <template v-if="activePlayoffs.length > 0">
        <div class="playoffs-header">Playoffs</div>
        <ScheduleWeekSection
          v-for="{ round, games } in activePlayoffs"
          :key="round"
          :label="round"
          :games="games"
        />
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

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  gap: 1rem;
}

h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: #f0f0f0;
}

.tabs {
  display: flex;
  gap: 0.25rem;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 0.25rem;
}

.tab {
  padding: 0.35rem 1rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab:hover { color: #ccc; }
.tab.active { background: #333; color: #fff; }

.playoffs-header {
  font-size: 1rem;
  font-weight: 700;
  color: #f0f0f0;
  margin: 2rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #333;
}
</style>
