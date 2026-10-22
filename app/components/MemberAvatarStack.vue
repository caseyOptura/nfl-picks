<script setup lang="ts">
import type { MemberPickSummary } from '~/types/picks'

const props = defineProps<{
  picks: MemberPickSummary[]
  teamId: string
}>()

// Beyond this many, show one fewer plus a "+n" bubble that opens the rest.
const MAX_BUBBLES = 4

const members = computed(() => props.picks.filter(m => m.pickedTeamId === props.teamId))
const shown = computed(() =>
  members.value.length > MAX_BUBBLES ? members.value.slice(0, MAX_BUBBLES - 1) : members.value,
)
const rest = computed(() => members.value.slice(shown.value.length))

const showRest = ref(false)
onKeyStroke('Escape', () => { showRest.value = false })

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
</script>

<template>
  <div v-if="members.length" class="avatar-stack">
    <div v-for="m in shown" :key="m.userId" class="avatar-wrap">
      <img v-if="m.avatarUrl" :src="m.avatarUrl" :alt="m.displayName" class="avatar" />
      <span v-else class="avatar initials">{{ initials(m.displayName) }}</span>
      <span class="tooltip">{{ m.displayName }}</span>
    </div>
    <template v-if="rest.length">
      <button
        type="button"
        class="avatar more"
        aria-haspopup="dialog"
        :aria-label="`${rest.length} more: ${rest.map(m => m.displayName).join(', ')}`"
        @click="showRest = true"
      >
        +{{ rest.length }}
      </button>
      <!-- Teleported and fixed, so it is out of the row's layout and can never
           widen the page. Only rendered while open. -->
      <Teleport v-if="showRest" to="body">
        <div class="more-backdrop" @click="showRest = false">
          <div class="more-panel" role="dialog" aria-label="Also picked" @click.stop>
            <ul class="more-list">
              <li v-for="m in rest" :key="m.userId" class="more-item">
                <UserAvatar :name="m.displayName" :url="m.avatarUrl" :size="28" />
                <span class="more-name">{{ m.displayName }}</span>
              </li>
            </ul>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.avatar-stack { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.25rem; }
.avatar-wrap { position: relative; }
.avatar {
  display: block; width: 22px; height: 22px;
  border-radius: 50%; object-fit: cover; border: 1.5px solid #333;
}
.initials {
  background: #222; color: #aaa; font-size: 0.55rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center; user-select: none;
}
.more {
  display: flex; align-items: center; justify-content: center; padding: 0;
  background: #1a1a1a; color: #ccc; font-size: 0.55rem; font-weight: 700;
  font-variant-numeric: tabular-nums; cursor: pointer;
}
.more:hover { border-color: #555; color: #fff; }
.more:focus-visible { outline: 2px solid #555; outline-offset: 1px; }

/* Out of layout until shown: a hidden-but-present label still widens the page
   when its bubble sits near the right edge. Hover-only, so not on touch. */
.tooltip {
  display: none;
  position: absolute; bottom: calc(100% + 5px); left: 50%;
  transform: translateX(-50%);
  background: #1e1e1e; border: 1px solid #333; color: #f0f0f0;
  font-size: 0.7rem; white-space: nowrap; padding: 3px 7px; border-radius: 5px;
  pointer-events: none; z-index: 10;
}
@media (hover: hover) {
  .avatar-wrap:hover .tooltip { display: block; }
}

.more-backdrop {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgb(0 0 0 / 0.5);
}
.more-panel {
  width: min(16rem, calc(100vw - 2rem));
  max-height: 60vh;
  overflow-y: auto;
  padding: 0.5rem;
  background: #161616; border: 1px solid #333; border-radius: 10px;
  color: #f0f0f0;
}
.more-list { list-style: none; margin: 0; padding: 0; }
.more-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.5rem; }
.more-name { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
