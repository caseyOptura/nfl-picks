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
</script>

<template>
  <section class="week-section" role="tabpanel" :aria-label="typeof week === 'string' ? week : `Week ${week}`">
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

.games-list {
  display: flex;
  flex-direction: column;
}
</style>
