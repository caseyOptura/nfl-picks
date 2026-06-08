<script setup lang="ts">
import type { LeaderboardEntry } from '~/types/picks'

defineProps<{ entries: LeaderboardEntry[] }>()

const { userId } = useAuth()

function rankColor(rank: number): string {
  if (rank === 1) return '#fbbf24'
  if (rank === 2) return '#cbd5e1'
  if (rank === 3) return '#d97706'
  return '#555'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const f = parts[0]?.[0] ?? ''
  const l = parts[1]?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

function pctDisplay(pct: number): string {
  return (pct * 100).toFixed(0) + '%'
}
</script>

<template>
  <div class="leaderboard">
    <div
      v-for="entry in entries"
      :key="entry.userId"
      :class="['lb-row', { 'is-you': entry.userId === userId }]"
    >
      <div class="rank-badge" :style="{ background: rankColor(entry.rank) }">
        {{ entry.rank }}
      </div>

      <div class="avatar">
        <img v-if="entry.avatarUrl" :src="entry.avatarUrl" :alt="entry.displayName" class="avatar-img" />
        <span v-else class="avatar-initials">{{ initials(entry.displayName) }}</span>
      </div>

      <div class="member-info">
        <span class="display-name">
          {{ entry.displayName }}
          <span v-if="entry.userId === userId" class="you-tag">You</span>
        </span>
        <div class="pct-bar-wrap">
          <div class="pct-bar-track">
            <div class="pct-bar-fill" :style="{ width: pctDisplay(entry.pct) }" />
          </div>
          <span class="pct-label">{{ pctDisplay(entry.pct) }}</span>
        </div>
      </div>

      <div class="record">
        <span class="wins">{{ entry.wins }}</span>
        <span class="record-dash">-</span>
        <span class="losses">{{ entry.losses }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard { display: flex; flex-direction: column; gap: 0.25rem; }
.lb-row {
  display: grid;
  grid-template-columns: 32px 36px 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.5rem;
  border-radius: 8px;
  border-left: 3px solid transparent;
  transition: background 0.1s;
}
.lb-row.is-you { border-left-color: #fff; background: rgba(255, 255, 255, 0.04); }
.rank-badge {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700; color: #0a0a0a; flex-shrink: 0;
}
.avatar { flex-shrink: 0; }
.avatar-img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #333; }
.avatar-initials {
  width: 36px; height: 36px; border-radius: 50%; background: #2a2a2a; border: 2px solid #333;
  color: #ccc; font-size: 0.7rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.member-info { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
.display-name {
  font-size: 0.875rem; font-weight: 600; color: #f0f0f0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: flex; align-items: center; gap: 0.4rem;
}
.you-tag {
  font-size: 0.65rem; font-weight: 700; color: #888; background: #222;
  border-radius: 4px; padding: 1px 5px; text-transform: uppercase;
  letter-spacing: 0.04em; flex-shrink: 0;
}
.pct-bar-wrap { display: flex; align-items: center; gap: 0.4rem; }
.pct-bar-track { flex: 1; height: 4px; background: #222; border-radius: 2px; overflow: hidden; min-width: 40px; }
.pct-bar-fill { height: 100%; background: #fff; border-radius: 2px; transition: width 0.3s ease; }
.pct-label { font-size: 0.7rem; color: #666; flex-shrink: 0; width: 28px; text-align: right; }
.record { display: flex; align-items: center; gap: 0.15rem; flex-shrink: 0; }
.wins { font-size: 1rem; font-weight: 700; color: #f0f0f0; }
.record-dash { font-size: 0.85rem; color: #555; }
.losses { font-size: 1rem; font-weight: 700; color: #999; }
</style>
