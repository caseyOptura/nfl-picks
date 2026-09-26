<script setup lang="ts">
import type { ChatReactionSummary, ReactionEmoji } from '~/types/chat'

const props = defineProps<{
  reactions: ChatReactionSummary[]
  nameFor: (userId: string) => string | undefined
}>()

const emit = defineEmits<{ toggle: [emoji: ReactionEmoji] }>()

const { userId } = useAuth()
const bar = ref<HTMLElement | null>(null)
// Long-press on a chip (touch) shows who reacted; desktop gets the same list as a tooltip.
const who = ref<ReactionEmoji | null>(null)
let suppressClick = false

const { start: autoHide, stop: cancelHide } = useTimeoutFn(() => (who.value = null), 4000, { immediate: false })

function names(r: ChatReactionSummary) {
  return r.userIds.map((id) => (id === userId.value ? 'You' : props.nameFor(id) ?? 'Former member')).join(', ')
}

const whoLabel = computed(() => {
  const r = props.reactions.find((x) => x.emoji === who.value)
  return r ? `${r.emoji} ${names(r)}` : null
})

onLongPress(bar, (e) => {
  const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-emoji]')
  if (!chip || e.pointerType === 'mouse') return
  suppressClick = true
  who.value = chip.dataset.emoji as ReactionEmoji
  autoHide()
}, { delay: 450 })

onClickOutside(bar, () => {
  who.value = null
  cancelHide()
})

function onChip(emoji: ReactionEmoji) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  emit('toggle', emoji)
}
</script>

<template>
  <div ref="bar" class="reaction-bar" @contextmenu.prevent>
    <div class="chips">
      <button
        v-for="r in reactions"
        :key="r.emoji"
        type="button"
        class="chip"
        :class="{ mine: r.mine }"
        :data-emoji="r.emoji"
        :title="names(r)"
        :aria-pressed="r.mine"
        :aria-label="`${r.emoji} ${r.count}: ${names(r)}`"
        @click="onChip(r.emoji)"
      >
        <span class="emoji">{{ r.emoji }}</span>
        <span class="count">{{ r.count }}</span>
      </button>
    </div>
    <p v-if="whoLabel" class="who" role="status">{{ whoLabel }}</p>
  </div>
</template>

<style scoped>
.reaction-bar { display: flex; flex-direction: column; gap: 0.2rem; }
.chips { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: #161616;
  border: 1px solid #262626;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  color: #bbb;
  font-size: 0.78rem;
  line-height: 1.3;
  cursor: pointer;
  -webkit-touch-callout: none;
  user-select: none;
}
.chip:hover { border-color: #3a3a3a; }
.chip.mine { background: #1f2a3a; border-color: #3b82f6; color: #dbeafe; }
.emoji { font-size: 0.9rem; }
.count { font-variant-numeric: tabular-nums; font-weight: 600; }
.who { margin: 0; font-size: 0.72rem; color: #999; }
</style>
