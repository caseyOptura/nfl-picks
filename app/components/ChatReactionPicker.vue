<script setup lang="ts">
import { REACTION_EMOJI } from '~/types/chat'
import type { ReactionEmoji } from '~/types/chat'

const POPOVER_W = 296
const POPOVER_H = 44
const GAP = 6

const props = defineProps<{
  anchor: DOMRect
  selected: ReactionEmoji[]
}>()

const emit = defineEmits<{
  pick: [emoji: ReactionEmoji]
  close: []
}>()

// Touch devices get a bottom sheet; mouse users a popover by the message.
const sheet = useMediaQuery('(hover: none)')
const panel = ref<HTMLElement | null>(null)
const { width, height } = useWindowSize()

const position = computed(() => {
  if (sheet.value) return undefined
  const a = props.anchor
  const above = a.top - POPOVER_H - GAP
  const top = above > 8 ? above : Math.min(a.bottom + GAP, height.value - POPOVER_H - 8)
  const left = Math.max(8, Math.min(a.left, width.value - POPOVER_W - 8))
  return { top: `${top}px`, left: `${left}px` }
})

const returnFocus = import.meta.client ? (document.activeElement as HTMLElement | null) : null
onMounted(() => panel.value?.querySelector('button')?.focus())
// Not on touch: refocusing the composer would pop the keyboard back up.
onUnmounted(() => {
  if (!sheet.value) returnFocus?.focus?.()
})

onKeyStroke('Escape', () => emit('close'))

// A long-press opens the sheet under the finger; the click that follows the
// release must neither close it nor pick whichever emoji ended up underneath.
let releasing = sheet.value
useEventListener('pointerup', () => setTimeout(() => (releasing = false), 400), { once: true })
function close() {
  if (!releasing) emit('close')
}
function pick(emoji: ReactionEmoji) {
  if (!releasing) emit('pick', emoji)
}
// The popover is positioned once; mobile browsers resize constantly as their toolbars move.
useEventListener('resize', () => {
  if (!sheet.value) emit('close')
})
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" :class="{ sheet }" @click="close" @contextmenu.prevent>
      <div
        ref="panel"
        class="panel"
        :class="{ sheet }"
        :style="position"
        role="dialog"
        aria-label="Add reaction"
        @click.stop
      >
        <button
          v-for="emoji in REACTION_EMOJI"
          :key="emoji"
          type="button"
          class="emoji"
          :class="{ selected: selected.includes(emoji) }"
          :aria-pressed="selected.includes(emoji)"
          :aria-label="`React ${emoji}`"
          @click="pick(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 60; }
.backdrop.sheet { background: rgb(0 0 0 / 0.5); display: flex; align-items: flex-end; }

.panel {
  position: fixed;
  display: flex;
  gap: 2px;
  padding: 4px;
  width: 296px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
}
.panel.sheet {
  position: static;
  width: 100%;
  justify-content: space-around;
  border-radius: 16px 16px 0 0;
  border-bottom: none;
  padding: 0.9rem 0.5rem calc(0.9rem + env(safe-area-inset-bottom));
}

.emoji {
  flex: 1;
  background: none;
  border: none;
  border-radius: 999px;
  font-size: 1.35rem;
  line-height: 1;
  padding: 0.4rem 0;
  cursor: pointer;
  transition: transform 0.1s;
}
.panel.sheet .emoji { font-size: 1.75rem; padding: 0.5rem 0; }
.emoji:hover, .emoji:focus-visible { background: #2a2a2a; transform: scale(1.15); outline: none; }
.emoji.selected { background: #1f2a3a; box-shadow: inset 0 0 0 1px #3b82f6; }
</style>
