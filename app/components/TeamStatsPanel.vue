<script setup lang="ts">
import type { TeamScheduleTeam, GameView } from '~/types/espn'

const props = defineProps<{
  team: TeamScheduleTeam
  teamId: string
  completedGames: GameView[]
}>()

const teamGames = computed(() =>
  props.completedGames.map(game => {
    const isHome = game.home.teamId === props.teamId
    const mySide = isHome ? game.home : game.away
    const oppSide = isHome ? game.away : game.home
    return {
      isHome,
      won: mySide.isWinner,
      teamScore: parseInt(mySide.score ?? '0', 10),
      oppScore: parseInt(oppSide.score ?? '0', 10),
    }
  })
)

const gamesPlayed = computed(() => teamGames.value.length)

const wins = computed(() => teamGames.value.filter(g => g.won).length)
const losses = computed(() => teamGames.value.filter(g => !g.won).length)

const homeGames = computed(() => teamGames.value.filter(g => g.isHome))
const homeWins = computed(() => homeGames.value.filter(g => g.won).length)
const homeLosses = computed(() => homeGames.value.filter(g => !g.won).length)

const awayGames = computed(() => teamGames.value.filter(g => !g.isHome))
const awayWins = computed(() => awayGames.value.filter(g => g.won).length)
const awayLosses = computed(() => awayGames.value.filter(g => !g.won).length)

const pointsFor = computed(() => teamGames.value.reduce((s, g) => s + g.teamScore, 0))
const pointsAgainst = computed(() => teamGames.value.reduce((s, g) => s + g.oppScore, 0))
const pointDiff = computed(() => pointsFor.value - pointsAgainst.value)
const avgFor = computed(() =>
  gamesPlayed.value ? (pointsFor.value / gamesPlayed.value).toFixed(1) : '—'
)
const avgAgainst = computed(() =>
  gamesPlayed.value ? (pointsAgainst.value / gamesPlayed.value).toFixed(1) : '—'
)
</script>

<template>
  <div class="stats-panel">
    <div class="stat-section">
      <h3 class="section-heading">Record</h3>
      <div class="stat-grid">
        <div class="stat-item">
          <span class="stat-label">Overall</span>
          <span class="stat-value">{{ wins }}-{{ losses }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Home</span>
          <span class="stat-value">{{ homeWins }}-{{ homeLosses }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Away</span>
          <span class="stat-value">{{ awayWins }}-{{ awayLosses }}</span>
        </div>
        <div v-if="team.standingSummary" class="stat-item">
          <span class="stat-label">Standing</span>
          <span class="stat-value standing">{{ team.standingSummary }}</span>
        </div>
      </div>
    </div>

    <div v-if="gamesPlayed > 0" class="stat-section">
      <h3 class="section-heading">Scoring</h3>
      <div class="stat-grid">
        <div class="stat-item">
          <span class="stat-label">Points Scored</span>
          <span class="stat-value">{{ pointsFor }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Points Allowed</span>
          <span class="stat-value">{{ pointsAgainst }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Point Diff</span>
          <span class="stat-value" :class="pointDiff >= 0 ? 'positive' : 'negative'">
            {{ pointDiff >= 0 ? '+' : '' }}{{ pointDiff }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Scored</span>
          <span class="stat-value">{{ avgFor }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Allowed</span>
          <span class="stat-value">{{ avgAgainst }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Games Played</span>
          <span class="stat-value">{{ gamesPlayed }}</span>
        </div>
      </div>
    </div>

    <EmptyState v-if="gamesPlayed === 0" message="No completed games yet this season" />
  </div>
</template>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-heading {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #555;
  margin-bottom: 0.75rem;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: #111;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.stat-label {
  font-size: 0.65rem;
  color: #555;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #eee;
}

.stat-value.standing {
  font-size: 0.85rem;
}

.stat-value.positive {
  color: #4ade80;
}

.stat-value.negative {
  color: #f87171;
}
</style>
