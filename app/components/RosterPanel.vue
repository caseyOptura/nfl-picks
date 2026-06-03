<script setup lang="ts">
import type { PositionGroup } from '~/types/espn'

defineProps<{ groups: PositionGroup[] }>()
</script>

<template>
  <div class="roster-panel">
    <div v-for="group in groups" :key="group.label" class="roster-group">
      <h3 class="group-heading">{{ group.label }}</h3>
      <RosterPlayerRow
        v-for="athlete in group.players"
        :key="athlete.id"
        :athlete="athlete"
      />
    </div>
  </div>
</template>

<style scoped>
.roster-panel {
  margin-top: 1rem;
}

.roster-group {
  margin-bottom: 2rem;
}

.group-heading {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
  margin-bottom: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #1e1e1e;
}
</style>
