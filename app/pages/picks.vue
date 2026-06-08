<script setup lang="ts">
import type { LeagueListItem } from '~/types/picks'

definePageMeta({ middleware: 'auth' })

const route = useRoute()

const { leagues, pending: leaguesPending, error: leaguesError } = useLeagues()

const activeLeague = ref<LeagueListItem | null>(null)

const activeLeagueId = computed(() => activeLeague.value?.id ?? '')
const seasonYear = computed(() => activeLeague.value?.season_year ?? 2025)

const { byWeek, pending: picksPending, error: picksError, submitPick } = usePicks(activeLeagueId, seasonYear)

const pending = computed(() => leaguesPending.value || picksPending.value)
const error = computed(() => leaguesError.value || picksError.value)

watch(leagues, (list) => {
  if (activeLeague.value) return
  const queryId = route.query.league as string | undefined
  const found = queryId ? list.find(l => l.id === queryId) : null
  activeLeague.value = found ?? list[0] ?? null
}, { immediate: true })

function switchLeague(id: string) {
  const found = leagues.value.find(l => l.id === id)
  if (!found) return
  activeLeague.value = found
  navigateTo({ query: { league: id } }, { replace: true })
}

async function handlePick(gameId: string, teamId: string) {
  await submitPick(gameId, teamId)
}
</script>

<template>
  <main class="picks-page">
    <LoadingState v-if="pending && !activeLeague" message="Loading…" />

    <template v-else-if="leagues.length === 0 && !leaguesPending">
      <EmptyState message="You're not in any leagues.">
        <template #action>
          <NuxtLink class="link-leagues" to="/leagues">Browse Leagues</NuxtLink>
        </template>
      </EmptyState>
    </template>

    <template v-else>
      <div class="picks-header">
        <div v-if="activeLeague" class="league-identity">
          <img
            v-if="activeLeague.photo_url"
            :src="activeLeague.photo_url"
            :alt="activeLeague.name"
            class="league-photo"
          />
          <h1>{{ activeLeague.name }}</h1>
        </div>

        <LeagueSwitcher
          v-if="leagues.length > 1"
          :leagues="leagues"
          :active-id="activeLeagueId"
          @change="switchLeague"
        />
      </div>

      <LoadingState v-if="picksPending" message="Loading picks…" />
      <ErrorState v-else-if="error" :message="error.message" @retry="() => {}" />

      <template v-else>
        <EmptyState v-if="byWeek.length === 0" message="No games scheduled yet." />

        <div v-else class="weeks">
          <PickWeekSection
            v-for="section in byWeek"
            :key="String(section.week)"
            :week="section.week"
            :games="section.games"
            @pick="handlePick"
          />
        </div>
      </template>
    </template>
  </main>
</template>

<style scoped>
.picks-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.picks-header {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.league-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.league-photo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #222;
  flex-shrink: 0;
}

.league-identity h1 {
  margin: 0;
}

.weeks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.link-leagues {
  color: #f0f0f0;
  text-decoration: underline;
  font-size: 0.9rem;
}
</style>
