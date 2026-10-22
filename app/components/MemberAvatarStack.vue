<script setup lang="ts">
import type { MemberPickSummary } from '~/types/picks'

const props = defineProps<{
  picks: MemberPickSummary[]
  teamId: string
}>()

// Beyond this many, show one fewer plus a "+n" bubble that opens the rest.
const MAX_BUBBLES = 6

const members = computed(() => props.picks.filter(m => m.pickedTeamId === props.teamId))
const shown = computed(() =>
  members.value.length > MAX_BUBBLES ? members.value.slice(0, MAX_BUBBLES - 1) : members.value,
)
const rest = computed(() => members.value.slice(shown.value.length))

const showRest = ref(false)

// Tapping a bubble shows that member's name; hover does the same with a mouse.
const stack = ref<HTMLElement | null>(null)
const openId = ref<string | null>(null)
const tipShift = ref(0)

function toggleName(userId: string, e: MouseEvent) {
  if (openId.value === userId) {
    openId.value = null
    return
  }
  openId.value = userId
  tipShift.value = 0
  // Nudge the label back on screen if it would hang off either edge.
  const tip = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.tooltip')
  nextTick(() => {
    if (!tip) return
    const r = tip.getBoundingClientRect()
    const margin = 8
    if (r.right > window.innerWidth - margin) tipShift.value = window.innerWidth - margin - r.right
    else if (r.left < margin) tipShift.value = margin - r.left
  })
}

onClickOutside(stack, () => { openId.value = null })
onKeyStroke('Escape', () => {
  showRest.value = false
  openId.value = null
})

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
</script>

<template>
  <div v-if="members.length" ref="stack" class="avatar-stack">
    <button
      v-for="m in shown"
      :key="m.userId"
      type="button"
      class="avatar-wrap"
      :aria-label="m.displayName"
      :aria-expanded="openId === m.userId"
      @click="toggleName(m.userId, $event)"
    >
      <img v-if="m.avatarUrl" :src="m.avatarUrl" alt="" class="avatar" />
      <span v-else class="avatar initials" aria-hidden="true">{{ initials(m.displayName) }}</span>
      <span
        class="tooltip"
        :class="{ open: openId === m.userId }"
        :style="openId === m.userId && tipShift ? { '--shift': `${tipShift}px` } : undefined"
        aria-hidden="true"
      >{{ m.displayName }}</span>
    </button>
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
.avatar-wrap {
  position: relative; display: block; padding: 0;
  background: none; border: none; border-radius: 50%; cursor: pointer;
}
.avatar-wrap:focus-visible { outline: 2px solid #555; outline-offset: 1px; }
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
   when its bubble sits near the right edge. Shown on tap (.open), or on hover
   with a mouse; a tapped label is nudged back on screen in toggleName(). */
.tooltip {
  display: none;
  position: absolute; bottom: calc(100% + 5px); left: 50%;
  transform: translateX(calc(-50% + var(--shift, 0px)));
  background: #1e1e1e; border: 1px solid #333; color: #f0f0f0;
  font-size: 0.7rem; white-space: nowrap; padding: 3px 7px; border-radius: 5px;
  pointer-events: none; z-index: 10;
}
.tooltip.open { display: block; }
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
