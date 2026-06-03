<script setup lang="ts">
import type { AthleteDetail } from '~/types/espn'

const props = defineProps<{ athlete: AthleteDetail }>()

const bgColor = computed(() =>
  props.athlete.team?.color ? `#${props.athlete.team.color}` : '#111'
)
</script>

<template>
  <header class="player-header" :style="{ backgroundColor: bgColor }">
    <div class="headshot-wrap">
      <img
        v-if="athlete.headshot?.href"
        :src="athlete.headshot.href"
        :alt="athlete.fullName"
        class="headshot"
      />
      <div v-else class="headshot-fallback">
        {{ athlete.firstName?.[0] }}{{ athlete.lastName?.[0] }}
      </div>
    </div>
    <div class="player-identity">
      <div class="player-meta">
        <span v-if="athlete.jersey" class="jersey">#{{ athlete.jersey }}</span>
        <span v-if="athlete.position?.displayName" class="pos-badge">{{ athlete.position.displayName }}</span>
      </div>
      <h1 class="player-name">{{ athlete.fullName }}</h1>
      <div v-if="athlete.team?.displayName" class="team-name">
        {{ athlete.team.displayName }}
      </div>
    </div>
  </header>
</template>

<style scoped>
.player-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  min-height: 100px;
}

.headshot-wrap {
  flex-shrink: 0;
}

.headshot {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.headshot-fallback {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}

.player-identity {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.player-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.jersey {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 700;
}

.pos-badge {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(0, 0, 0, 0.25);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.player-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}

.team-name {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.65);
}
</style>
