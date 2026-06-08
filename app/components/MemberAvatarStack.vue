<script setup lang="ts">
import type { MemberPickSummary } from '~/types/picks'

const props = defineProps<{
  picks: MemberPickSummary[]
  teamId: string
}>()

const members = computed(() => props.picks.filter(m => m.pickedTeamId === props.teamId))

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
</script>

<template>
  <div v-if="members.length" class="avatar-stack">
    <div v-for="m in members" :key="m.userId" class="avatar-wrap">
      <img v-if="m.avatarUrl" :src="m.avatarUrl" :alt="m.displayName" class="avatar" />
      <span v-else class="avatar initials">{{ initials(m.displayName) }}</span>
      <span class="tooltip">{{ m.displayName }}</span>
    </div>
  </div>
</template>

<style scoped>
.avatar-stack { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.25rem; }
.avatar-wrap { position: relative; }
.avatar-wrap:hover .tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
.avatar {
  display: block; width: 22px; height: 22px;
  border-radius: 50%; object-fit: cover; border: 1.5px solid #333;
}
.initials {
  background: #222; color: #aaa; font-size: 0.55rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; user-select: none;
}
.tooltip {
  position: absolute; bottom: calc(100% + 5px); left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: #1e1e1e; border: 1px solid #333; color: #f0f0f0;
  font-size: 0.7rem; white-space: nowrap; padding: 3px 7px; border-radius: 5px;
  opacity: 0; transition: opacity 0.12s, transform 0.12s; pointer-events: none; z-index: 10;
}
</style>
