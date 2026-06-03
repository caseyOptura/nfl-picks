<script setup lang="ts">
import type { TeamListEntry } from '~/types/espn'

defineProps<{ team: TeamListEntry }>()
</script>

<template>
  <NuxtLink :to="`/teams/${team.id}`" class="team-card">
    <img
      v-if="team.logos[0]?.href"
      :src="team.logos[0].href"
      :alt="team.displayName"
      class="team-logo"
    />
    <div v-else class="team-logo-fallback">{{ team.abbreviation }}</div>
    <span class="team-name">{{ team.displayName }}</span>
  </NuxtLink>
</template>

<style scoped>
.team-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  background: #111;
  border: 1px solid #222;
  border-radius: 8px;
  text-decoration: none;
  color: #f0f0f0;
  transition: background 0.15s, border-color 0.15s;
  min-width: 0;
}

.team-card:hover {
  background: #1a1a1a;
  border-color: #444;
}

.team-logo {
  width: 56px;
  height: 56px;
  object-fit: contain;
  flex-shrink: 0;
}

.team-logo-fallback {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #222;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.85rem;
  color: #aaa;
  flex-shrink: 0;
}

.team-name {
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
  color: #ddd;
  line-height: 1.2;
  word-break: break-word;
}
</style>
