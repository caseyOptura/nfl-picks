<script setup lang="ts">
import type { PickableGame } from '~/types/picks'
import type { GameSideView } from '~/types/espn'
import { formatGameTime } from '~/utils/formatDate'

defineProps<{ pickable: PickableGame }>()

const emit = defineEmits<{ pick: [teamId: string] }>()

function handlePick(teamId: string, locked: boolean) {
  if (!locked) emit('pick', teamId)
}

function statusLabel(p: PickableGame): string {
  if (p.game.isFinal) return 'FINAL'
  if (p.game.isInProgress) return 'IN PROGRESS'
  return formatGameTime(p.game.kickoffUtc)
}

function isPicked(side: GameSideView, pickedTeamId: string | null): boolean {
  return pickedTeamId !== null && side.teamId === pickedTeamId
}
</script>

<template>
  <div :class="['game-row', { locked: pickable.locked }]">
    <div class="team-col">
      <button
        :class="['team-btn', {
          picked:    isPicked(pickable.game.away, pickable.pickedTeamId),
          correct:   isPicked(pickable.game.away, pickable.pickedTeamId) && pickable.correct === true,
          incorrect: isPicked(pickable.game.away, pickable.pickedTeamId) && pickable.correct === false,
        }]"
        :disabled="pickable.locked"
        @click="handlePick(pickable.game.away.teamId, pickable.locked)"
      >
        <img v-if="pickable.game.away.logo" :src="pickable.game.away.logo" :alt="pickable.game.away.abbreviation" class="team-logo" />
        <span class="team-abbr">{{ pickable.game.away.abbreviation }}</span>
        <span v-if="pickable.game.away.score !== undefined" class="team-score">{{ pickable.game.away.score }}</span>
        <span v-if="isPicked(pickable.game.away, pickable.pickedTeamId) && pickable.correct === true" class="result-icon correct-icon">&#10003;</span>
        <span v-else-if="isPicked(pickable.game.away, pickable.pickedTeamId) && pickable.correct === false" class="result-icon incorrect-icon">&#10007;</span>
      </button>
      <MemberAvatarStack :picks="pickable.memberPicks" :team-id="pickable.game.away.teamId" />
    </div>

    <div class="game-status">
      <span v-if="pickable.locked && !pickable.game.isFinal && !pickable.game.isInProgress" class="lock-icon" aria-label="Locked">
        <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="1" y="6" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="status-text">{{ statusLabel(pickable) }}</span>
    </div>

    <div class="team-col">
      <button
        :class="['team-btn', {
          picked:    isPicked(pickable.game.home, pickable.pickedTeamId),
          correct:   isPicked(pickable.game.home, pickable.pickedTeamId) && pickable.correct === true,
          incorrect: isPicked(pickable.game.home, pickable.pickedTeamId) && pickable.correct === false,
        }]"
        :disabled="pickable.locked"
        @click="handlePick(pickable.game.home.teamId, pickable.locked)"
      >
        <img v-if="pickable.game.home.logo" :src="pickable.game.home.logo" :alt="pickable.game.home.abbreviation" class="team-logo" />
        <span class="team-abbr">{{ pickable.game.home.abbreviation }}</span>
        <span v-if="pickable.game.home.score !== undefined" class="team-score">{{ pickable.game.home.score }}</span>
        <span v-if="isPicked(pickable.game.home, pickable.pickedTeamId) && pickable.correct === true" class="result-icon correct-icon">&#10003;</span>
        <span v-else-if="isPicked(pickable.game.home, pickable.pickedTeamId) && pickable.correct === false" class="result-icon incorrect-icon">&#10007;</span>
      </button>
      <MemberAvatarStack :picks="pickable.memberPicks" :team-id="pickable.game.home.teamId" />
    </div>
  </div>
</template>

<style scoped>
.game-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #1a1a1a;
}
.team-col { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; min-width: 0; }
.game-row.locked .team-btn { opacity: 0.6; cursor: default; }
.team-btn {
  display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  padding: 0.5rem 0.25rem; background: #111; border: 2px solid transparent;
  border-radius: 8px; cursor: pointer; transition: border-color 0.12s, background 0.12s;
  min-width: 0; width: 100%; position: relative;
}
.team-btn:not(:disabled):hover { border-color: #444; background: #1a1a1a; }
.team-btn.picked   { border-color: #fff; background: #1c1c1c; }
.team-btn.correct  { border-color: #22c55e; background: rgba(34, 197, 94, 0.08); }
.team-btn.incorrect { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
.team-logo { width: 36px; height: 36px; object-fit: contain; }
.team-abbr { font-size: 0.8rem; font-weight: 700; color: #f0f0f0; letter-spacing: 0.03em; }
.team-score { font-size: 1rem; font-weight: 700; color: #fff; }
.result-icon { position: absolute; top: 4px; right: 6px; font-size: 0.75rem; font-weight: 700; line-height: 1; }
.correct-icon { color: #22c55e; }
.incorrect-icon { color: #ef4444; }
.game-status {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.25rem; min-width: 72px; padding-top: 0.5rem;
}
.lock-icon { color: #666; display: flex; }
.status-text { font-size: 0.7rem; color: #777; text-align: center; line-height: 1.3; white-space: pre-line; }
</style>
