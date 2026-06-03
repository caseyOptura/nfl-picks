<script setup lang="ts">
import type { GameView } from '~/types/espn'

defineProps<{
  week?: number
  label?: string
  games: GameView[]
}>()
</script>

<template>
  <section class="week-section">
    <h2 class="week-heading">{{ label ?? `Week ${week}` }}</h2>
    <GameRow v-for="game in games" :key="game.id" :game="game" />
  </section>
</template>

<style scoped>
.week-section {
  margin-bottom: 2rem;
}

.week-heading {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #1e1e1e;
}
</style>
