<script setup lang="ts">
import type { LeagueListItem } from '~/types/picks'

defineProps<{
  league: LeagueListItem
}>()

function leagueInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}
</script>

<template>
  <NuxtLink :to="'/leagues/' + league.id" class="league-card">
    <div class="card-photo">
      <img v-if="league.photo_url" :src="league.photo_url" :alt="league.name" class="photo-img" />
      <div v-else class="photo-placeholder">{{ leagueInitials(league.name) }}</div>
    </div>
    <div class="card-body">
      <div class="card-header">
        <span class="league-name">{{ league.name }}</span>
        <span v-if="league.role === 'owner'" class="role-badge">Owner</span>
      </div>
      <div class="card-meta">
        <span class="season">{{ league.season_year }} Season</span>
        <span class="members">{{ league.memberCount }} {{ league.memberCount === 1 ? 'member' : 'members' }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.league-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #111;
  border: 1px solid #222;
  border-radius: 10px;
  padding: 1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.league-card:hover {
  border-color: #444;
  background: #161616;
}

.card-photo {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #2a2a2a;
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: #555;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.league-name {
  font-weight: 700;
  font-size: 1rem;
  color: #f0f0f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #fbbf24;
  border: 1px solid #fbbf2440;
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.card-meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
  color: #666;
}
</style>
