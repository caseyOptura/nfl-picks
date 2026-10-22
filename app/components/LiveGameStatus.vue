<script setup lang="ts">
import type { LiveGame } from '~/types/espn'
import { liveClockLabel } from '~/composables/mapGame'

/** The centre column of an in-progress game. Before the first live poll lands, just "Live". */
defineProps<{ live?: LiveGame }>()
</script>

<template>
  <div class="live-status">
    <span class="live-clock">{{ live ? liveClockLabel(live) : 'Live' }}</span>
    <template v-if="live?.downDistance">
      <span class="live-down" :class="{ 'red-zone': live.isRedZone }">{{ live.downDistance }}</span>
      <span v-if="live.ballOn" class="live-ball">{{ live.ballOn }}</span>
    </template>
  </div>
</template>

<style scoped>
.live-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  line-height: 1.2;
  white-space: nowrap;
}

.live-clock {
  font-size: 0.75rem;
  color: #4ade80;
  font-weight: 700;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
}

.live-down {
  font-size: 0.7rem;
  color: #ccc;
  font-weight: 600;
}

.live-down.red-zone {
  color: #f87171;
}

.live-ball {
  font-size: 0.65rem;
  color: #777;
}
</style>
