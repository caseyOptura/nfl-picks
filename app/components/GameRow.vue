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
      <span class="team-ident">
        <span class="side-label">Away</span>
        <span class="team-abbr">{{ game.away.abbreviation }}</span>
        <span v-if="game.away.record" class="team-record">{{ game.away.record }}</span>
      </span>
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
      <span class="team-ident">
        <span class="side-label">Home</span>
        <span class="team-abbr">{{ game.home.abbreviation }}</span>
        <span v-if="game.home.record" class="team-record">{{ game.home.record }}</span>
      </span>
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

/* Home/away tag over abbreviation over record, so the extra line costs no horizontal room at 375px. */
.team-ident {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
  min-width: 0;
}

.team-side--home .team-ident {
  align-items: flex-end;
}

.side-label {
  font-size: 0.55rem;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.team-abbr {
  font-size: 0.85rem;
  color: #ccc;
  font-weight: 600;
  white-space: nowrap;
}

.team-record {
  font-size: 0.65rem;
  color: #777;
  font-weight: 500;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.winner .team-record {
  color: #999;
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
