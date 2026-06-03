<script setup lang="ts">
import type { RosterAthlete } from '~/types/espn'

const props = defineProps<{ athlete: RosterAthlete }>()

const initials = computed(() => {
  const parts = props.athlete.fullName.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0]?.[0]?.toUpperCase() ?? '?'
})
</script>

<template>
  <NuxtLink :to="`/players/${athlete.id}`" class="player-row">
    <div class="headshot-wrap">
      <img
        v-if="athlete.headshot?.href"
        :src="athlete.headshot.href"
        :alt="athlete.fullName"
        class="headshot"
      />
      <div v-else class="headshot-fallback">{{ initials }}</div>
    </div>

    <div class="player-info">
      <div class="player-name-line">
        <span v-if="athlete.jersey" class="jersey">#{{ athlete.jersey }}</span>
        <span class="full-name">{{ athlete.fullName }}</span>
        <span v-if="athlete.position?.abbreviation" class="position">{{ athlete.position.abbreviation }}</span>
      </div>
      <div class="player-details">
        <span v-if="athlete.age != null">Age {{ athlete.age }}</span>
        <span v-if="athlete.displayHeight">{{ athlete.displayHeight }}</span>
        <span v-if="athlete.displayWeight">{{ athlete.displayWeight }}</span>
        <span v-if="athlete.experience != null">Yr {{ athlete.experience.years }}</span>
        <span v-if="athlete.college?.name">{{ athlete.college.name }}</span>
      </div>
    </div>

    <span class="chevron" aria-hidden="true">›</span>
  </NuxtLink>
</template>

<style scoped>
.player-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem;
  border-bottom: 1px solid #1a1a1a;
  text-decoration: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
}

.player-row:hover {
  background: #111;
}

.headshot-wrap {
  flex-shrink: 0;
}

.headshot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: #1e1e1e;
}

.headshot-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #222;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #888;
}

.player-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1;
}

.player-name-line {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.jersey {
  font-size: 0.75rem;
  color: #888;
  font-weight: 600;
}

.full-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #eee;
}

.position {
  font-size: 0.7rem;
  color: #888;
  background: #222;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
}

.player-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: #666;
}

.chevron {
  color: #444;
  font-size: 1.2rem;
  flex-shrink: 0;
}
</style>
