<script setup lang="ts">
import type { PickableGame } from '~/types/picks'

defineProps<{
  week: number | string
  games: PickableGame[]
}>()

const emit = defineEmits<{ pick: [gameId: string, teamId: string] }>()

function handlePick(gameId: string, teamId: string) {
  emit('pick', gameId, teamId)
}

function weekLabel(week: number | string): string {
  if (typeof week === 'string') return week
  return `Week ${week}`
}
</script>

<template>
  <section class="week-section">
    <h2 class="week-heading">{{ weekLabel(week) }}</h2>
    <div class="games-list">
      <PickGameRow
        v-for="pg in games"
        :key="pg.game.id"
        :pickable="pg"
        @pick="(teamId) => handlePick(pg.game.id, teamId)"
      />
    </div>
  </section>
</template>

<style scoped>
.week-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.week-heading {
  font-size: 0.8rem;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.75rem 0 0.25rem;
  margin: 0;
  border-top: 1px solid #222;
}

.games-list {
  display: flex;
  flex-direction: column;
}
</style>
