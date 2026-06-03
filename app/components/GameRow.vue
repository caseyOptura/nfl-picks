<script setup lang="ts">
import type { GameView } from '~/types/espn'
import { formatGameTime } from '~/utils/formatDate'

defineProps<{ game: GameView }>()
</script>

<template>
  <div class="game-row">
    <div class="team-side" :class="{ winner: game.away.isWinner && game.isFinal }">
      <img
        v-if="game.away.logo"
        :src="game.away.logo"
        :alt="game.away.displayName"
        class="team-logo"
      />
      <span v-else class="team-abbr-fallback">{{ game.away.abbreviation }}</span>
      <span class="team-abbr">{{ game.away.abbreviation }}</span>
      <span v-if="game.away.score !== undefined" class="score">{{ game.away.score }}</span>
    </div>

    <div class="game-meta">
      <span v-if="game.isFinal" class="status-final">Final</span>
      <span v-else-if="game.isInProgress" class="status-live">Live</span>
      <template v-else>
        <span class="kickoff-time">{{ formatGameTime(game.kickoffUtc) }}</span>
        <span v-if="game.venue" class="venue">{{ game.venue }}</span>
      </template>
    </div>

    <div class="team-side team-side--home" :class="{ winner: game.home.isWinner && game.isFinal }">
      <span v-if="game.home.score !== undefined" class="score">{{ game.home.score }}</span>
      <span class="team-abbr">{{ game.home.abbreviation }}</span>
      <img
        v-if="game.home.logo"
        :src="game.home.logo"
        :alt="game.home.displayName"
        class="team-logo"
      />
      <span v-else class="team-abbr-fallback">{{ game.home.abbreviation }}</span>
    </div>
  </div>
</template>

<style scoped>
.game-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #1e1e1e;
  gap: 0.5rem;
}

.team-side {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1;
}

.team-side--home {
  justify-content: flex-end;
}

.team-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.team-abbr-fallback {
  display: none;
}

.team-abbr {
  font-size: 0.85rem;
  color: #ccc;
  font-weight: 600;
  white-space: nowrap;
}

.winner .team-abbr {
  color: #fff;
  font-weight: 700;
}

.score {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}

.winner .score {
  color: #fff;
}

.game-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex-shrink: 0;
  min-width: 80px;
  gap: 0.15rem;
}

.status-final {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-live {
  font-size: 0.75rem;
  color: #4ade80;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
}

.kickoff-time {
  font-size: 0.75rem;
  color: #aaa;
  white-space: nowrap;
}

.venue {
  font-size: 0.65rem;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
</style>
