<script setup lang="ts">
import { REACTION_EMOJI } from '~/types/chat'
import type { ChatMessageAction, ReactionEmoji } from '~/types/chat'

const EMOJI_W = 296
const EMOJI_H = 44
const ACTIONS_W = 180
const ACTION_H = 36
const GAP = 6

const LABELS: Record<ChatMessageAction, string> = {
  reply: 'Reply',
  edit: 'Edit',
  copy: 'Copy text',
  delete: 'Delete',
}

const props = defineProps<{
  anchor: DOMRect
  selected: ReactionEmoji[]
  emoji: boolean
  actions: ChatMessageAction[]
}>()

const emit = defineEmits<{
  pick: [emoji: ReactionEmoji]
  action: [action: ChatMessageAction]
  close: []
}>()

// Touch devices get a bottom sheet; mouse users a popover by the message.
const sheet = useMediaQuery('(hover: none)')
const panel = ref<HTMLElement | null>(null)
const { width, height } = useWindowSize()

const position = computed(() => {
  if (sheet.value) return undefined
  const a = props.anchor
  const w = props.emoji ? EMOJI_W : ACTIONS_W
  const h = (props.emoji ? EMOJI_H : 0) + props.actions.length * ACTION_H + 8
  const above = a.top - h - GAP
  const top = above > 8 ? above : Math.min(a.bottom + GAP, height.value - h - 8)
  const left = Math.max(8, Math.min(a.left, width.value - w - 8))
  return { top: `${top}px`, left: `${left}px`, width: `${w}px` }
})

const returnFocus = import.meta.client ? (document.activeElement as HTMLElement | null) : null
onMounted(() => panel.value?.querySelector('button')?.focus())
// Not on touch: refocusing the composer would pop the keyboard back up.
onUnmounted(() => {
  if (!sheet.value) returnFocus?.focus?.()
})

onKeyStroke('Escape', () => emit('close'))

// A long-press opens the sheet under the finger; the click that follows the
// release must neither close it nor pick whichever button ended up underneath.
let releasing = sheet.value
useEventListener('pointerup', () => setTimeout(() => (releasing = false), 400), { once: true })
function close() {
  if (!releasing) emit('close')
}
function pick(emoji: ReactionEmoji) {
  if (!releasing) emit('pick', emoji)
}
function act(action: ChatMessageAction) {
  if (!releasing) emit('action', action)
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
        :aria-label="emoji ? 'Add reaction' : 'Message actions'"
        @click.stop
      >
        <div v-if="emoji" class="emoji-row">
          <button
            v-for="e in REACTION_EMOJI"
            :key="e"
            type="button"
            class="emoji"
            :class="{ selected: selected.includes(e) }"
            :aria-pressed="selected.includes(e)"
            :aria-label="`React ${e}`"
            @click="pick(e)"
          >
            {{ e }}
          </button>
        </div>
        <div v-if="actions.length" class="actions">
          <button
            v-for="a in actions"
            :key="a"
            type="button"
            class="action"
            :class="{ danger: a === 'delete' }"
            @click="act(a)"
          >
            {{ LABELS[a] }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 60; }
.backdrop.sheet { background: rgb(0 0 0 / 0.5); display: flex; align-items: flex-end; }

.panel {
  position: fixed;
  padding: 4px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
}
.panel:has(.emoji-row):not(:has(.actions)) { border-radius: 999px; }
.panel.sheet {
  position: static;
  width: 100%;
  border-radius: 16px 16px 0 0;
  border-bottom: none;
  padding: 0.9rem 0.5rem calc(0.9rem + env(safe-area-inset-bottom));
}

.emoji-row { display: flex; gap: 2px; }
.panel.sheet .emoji-row { justify-content: space-around; }
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

.actions { display: flex; flex-direction: column; }
.panel.sheet .actions { margin-top: 0.6rem; border-top: 1px solid #262626; padding-top: 0.4rem; }
.action {
  background: none;
  border: none;
  border-radius: 6px;
  color: #e5e5e5;
  font: inherit;
  font-size: 0.88rem;
  text-align: left;
  height: 36px;
  padding: 0 0.75rem;
  cursor: pointer;
}
.panel.sheet .action { height: 46px; font-size: 1rem; }
.action:hover, .action:focus-visible { background: #262626; outline: none; }
.action.danger { color: #f87171; }
</style>
