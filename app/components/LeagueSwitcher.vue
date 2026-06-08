<script setup lang="ts">
import type { LeagueListItem } from '~/types/picks'

defineProps<{
  leagues: LeagueListItem[]
  activeId: string
}>()

const emit = defineEmits<{ change: [id: string] }>()

function select(id: string) {
  emit('change', id)
}
</script>

<template>
  <div class="switcher" role="tablist" aria-label="League selector">
    <button
      v-for="league in leagues"
      :key="league.id"
      role="tab"
      :aria-selected="league.id === activeId"
      :class="['pill', { active: league.id === activeId }]"
      @click="select(league.id)"
    >
      {{ league.name }}
    </button>
  </div>
</template>

<style scoped>
.switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pill {
  padding: 0.375rem 0.875rem;
  border-radius: 99px;
  border: 1px solid #333;
  background: transparent;
  color: #999;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  white-space: nowrap;
}

.pill:hover {
  border-color: #555;
  color: #ddd;
}

.pill.active {
  background: #fff;
  border-color: #fff;
  color: #0a0a0a;
}
</style>
