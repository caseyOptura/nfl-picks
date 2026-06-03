<script setup lang="ts">
import type { TeamScheduleTeam } from '~/types/espn'

const props = defineProps<{ team: TeamScheduleTeam }>()

const bgColor = computed(() =>
  props.team.color ? `#${props.team.color}` : '#111'
)

const conference = computed(() => {
  const summary = props.team.standingSummary ?? ''
  if (summary.includes('AFC')) return 'AFC'
  if (summary.includes('NFC')) return 'NFC'
  return ''
})
</script>

<template>
  <header class="team-header" :style="{ backgroundColor: bgColor }">
    <img
      v-if="team.logos?.[0]?.href"
      :src="team.logos[0].href"
      :alt="team.displayName"
      class="team-logo"
    />
    <div class="team-info">
      <h1 class="team-name">{{ team.displayName }}</h1>
      <div class="team-meta">
        <span v-if="conference" class="conference">{{ conference }}</span>
        <span v-if="team.recordSummary" class="record">{{ team.recordSummary }}</span>
        <span v-if="team.standingSummary" class="standing">{{ team.standingSummary }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.team-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  min-height: 80px;
}

.team-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  flex-shrink: 0;
}

.team-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.team-name {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}

.team-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.conference,
.record,
.standing {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.75);
}

.conference {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.record {
  font-weight: 600;
}
</style>
