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
// The member whose profile card is open, from a bubble or the "+n" list.
const profile = ref<MemberPickSummary | null>(null)

function openProfile(m: MemberPickSummary) {
  showRest.value = false
  profile.value = m
}

onKeyStroke('Escape', () => { showRest.value = false })

// Hold the page still while either popup is open.
const scrollLocked = useScrollLock(import.meta.client ? document.documentElement : null)
watch(() => showRest.value || profile.value !== null, open => { scrollLocked.value = open })

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}
</script>

<template>
  <div v-if="members.length" class="avatar-stack">
    <button
      v-for="m in shown"
      :key="m.userId"
      type="button"
      class="avatar-btn"
      aria-haspopup="dialog"
      :aria-label="m.displayName"
      @click="openProfile(m)"
    >
      <img v-if="m.avatarUrl" :src="m.avatarUrl" alt="" class="avatar" />
      <span v-else class="avatar initials" aria-hidden="true">{{ initials(m.displayName) }}</span>
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
              <li v-for="m in rest" :key="m.userId">
                <button type="button" class="more-item" aria-haspopup="dialog" @click="openProfile(m)">
                  <UserAvatar :name="m.displayName" :url="m.avatarUrl" :size="28" />
                  <span class="more-name">{{ m.displayName }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </Teleport>
    </template>
    <MemberProfileCard v-if="profile" :member="profile" @close="profile = null" />
  </div>
</template>

<style scoped>
.avatar-stack { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.25rem; }
.avatar-btn {
  display: block; padding: 0;
  background: none; border: none; border-radius: 50%; cursor: pointer;
}
.avatar-btn:hover .avatar { border-color: #555; }
.avatar-btn:focus-visible { outline: 2px solid #555; outline-offset: 1px; }
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

.more-backdrop {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgb(0 0 0 / 0.5);
}
.more-panel {
  width: min(16rem, calc(100vw - 2rem));
  max-height: 60vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.5rem;
  background: #161616; border: 1px solid #333; border-radius: 10px;
  color: #f0f0f0;
}
.more-list { list-style: none; margin: 0; padding: 0; }
.more-item {
  display: flex; align-items: center; gap: 0.6rem; width: 100%;
  padding: 0.4rem 0.5rem; border: none; border-radius: 6px;
  background: none; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.more-item:hover { background: #1f1f1f; }
.more-item:focus-visible { outline: 2px solid #555; outline-offset: -2px; }
.more-name { min-width: 0; font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
