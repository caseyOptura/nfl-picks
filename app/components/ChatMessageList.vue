<script setup lang="ts">
import type { ChatMessageAction, ChatMessageView, ReactionEmoji } from '~/types/chat'

const GROUP_WINDOW_MS = 5 * 60 * 1000
const NEAR_BOTTOM_PX = 120

const props = defineProps<{
  messages: ChatMessageView[]
  loading: boolean
  loadingOlder: boolean
  hasMore: boolean
  nameFor: (userId: string) => string | undefined
}>()

const emit = defineEmits<{
  loadOlder: []
  retry: [clientId: string]
  discard: [clientId: string]
  react: [messageId: number, emoji: ReactionEmoji]
  action: [message: ChatMessageView, action: ChatMessageAction]
  jump: [messageId: number]
}>()

// One menu for the whole list, teleported out of the scroller so it's never clipped.
const menu = useChatMessageMenu(() => props.messages)

function pick(emoji: ReactionEmoji) {
  if (menu.message.value) emit('react', menu.message.value.id!, emoji)
  menu.close()
}

function act(action: ChatMessageAction) {
  if (menu.message.value) emit('action', menu.message.value, action)
  menu.close()
}

const scroller = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)
const unseen = ref(0)
// Older pages may only load once we've landed at the bottom; otherwise the
// top sentinel is visible on first paint and pulls in a page nobody asked for.
const settled = ref(false)

const rows = computed(() =>
  props.messages.map((m, i) => {
    const prev = props.messages[i - 1]
    const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString()
    const grouped = !!prev && !newDay && prev.kind === 'user' && m.kind === 'user'
      && prev.userId === m.userId
      && Date.parse(m.createdAt) - Date.parse(prev.createdAt) < GROUP_WINDOW_MS
    return { m, grouped, day: newDay ? formatDayLabel(m.createdAt) : null }
  }),
)

function distanceFromBottom() {
  const el = scroller.value
  return el ? el.scrollHeight - el.scrollTop - el.clientHeight : 0
}

function scrollToBottom() {
  const el = scroller.value
  if (el) el.scrollTop = el.scrollHeight
  unseen.value = 0
}

function settle() {
  if (settled.value || !props.messages.length) return
  nextTick(() => {
    scrollToBottom()
    settled.value = true
    maybeLoadOlder() // short first page: fill the screen
  })
}

// Messages may already be loaded by the time the list mounts.
onMounted(settle)

// Snapshot layout before the DOM updates, then decide how to scroll after.
watch(() => props.messages, (next, prev) => {
  const el = scroller.value
  if (!el) return
  const prevHeight = el.scrollHeight
  const wasNearBottom = distanceFromBottom() < NEAR_BOTTOM_PX
  const wasAtBottom = distanceFromBottom() < 8
  const prevFirst = prev?.[0]?.clientId
  const prevLast = prev?.[prev.length - 1]?.clientId
  const nextLast = next[next.length - 1]

  if (!settled.value) return settle()

  nextTick(() => {
    if (next[0]?.clientId !== prevFirst && nextLast?.clientId === prevLast) {
      el.scrollTop += el.scrollHeight - prevHeight // older page prepended: hold position
      return
    }
    if (nextLast && nextLast.clientId !== prevLast) {
      if (wasNearBottom || nextLast.mine) return scrollToBottom()
      const idx = next.findIndex((m) => m.clientId === prevLast)
      unseen.value += idx >= 0 ? next.length - 1 - idx : 1
      return
    }
    // Same messages, new content (e.g. reaction chips): stay pinned to the bottom.
    if (wasAtBottom) scrollToBottom()
  })
}, { flush: 'pre' })

function maybeLoadOlder() {
  const el = scroller.value
  if (el && settled.value && props.hasMore && !props.loadingOlder && !props.loading && el.scrollTop < 200) emit('loadOlder')
}

useIntersectionObserver(sentinel, ([entry]) => {
  if (entry?.isIntersecting) maybeLoadOlder()
}, { root: scroller })

// The observer won't re-fire if the sentinel is still on screen after a page loads.
watch(() => props.loadingOlder, (busy) => {
  if (!busy) nextTick(maybeLoadOlder)
})

// Rows below the list (push nudge, send error) can shrink it; stay pinned when they do.
let pinned = true
useResizeObserver(scroller, () => {
  if (pinned && settled.value) scrollToBottom()
})

// Center a loaded message and flash it (reply quote → original).
function scrollToMessage(id: number) {
  const el = scroller.value?.querySelector<HTMLElement>(`[data-message-id="${id}"]`)
  if (!el) return false
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  el.classList.remove('flash')
  void el.offsetWidth // restart the animation
  el.classList.add('flash')
  return true
}
defineExpose({ scrollToMessage })

function onScroll() {
  pinned = distanceFromBottom() < 8
  if (unseen.value && distanceFromBottom() < NEAR_BOTTOM_PX) unseen.value = 0
}
</script>

<template>
  <div class="list-wrap">
    <div ref="scroller" class="scroller" role="log" aria-live="polite" aria-label="Chat messages" @scroll.passive="onScroll">
      <div ref="sentinel" class="sentinel" />
      <p v-if="loadingOlder" class="hint">Loading earlier messages…</p>
      <p v-else-if="!hasMore && messages.length" class="hint">This is the start of the league chat.</p>
      <p v-if="!loading && !messages.length" class="empty">No messages yet. Say something!</p>

      <template v-for="row in rows" :key="row.m.clientId">
        <div v-if="row.day" class="day"><span>{{ row.day }}</span></div>
        <ChatMessage
          :message="row.m"
          :grouped="row.grouped"
          :name-for="nameFor"
          @retry="emit('retry', $event)"
          @discard="emit('discard', $event)"
          @react="(id, emoji) => emit('react', id, emoji)"
          @open-menu="menu.open"
          @jump="emit('jump', $event)"
        />
      </template>
      <div class="tail" />
    </div>

    <ChatUnseenButton v-if="unseen" :count="unseen" @click="scrollToBottom" />

    <ChatMessageMenu
      v-if="menu.menu.value && menu.message.value"
      :anchor="menu.menu.value.anchor"
      :selected="menu.selected.value"
      :emoji="menu.menu.value.mode !== 'actions'"
      :actions="menu.actions.value"
      @pick="pick"
      @action="act"
      @close="menu.close"
    />
  </div>
</template>

<style scoped>
.list-wrap { position: relative; flex: 1; min-height: 0; }
.scroller { height: 100%; overflow-y: auto; overscroll-behavior: contain; padding-bottom: 0.75rem; }
.sentinel { height: 1px; }
.hint, .empty { text-align: center; font-size: 0.78rem; color: #555; padding: 0.75rem 1rem 0; }
.empty { padding-top: 3rem; font-size: 0.9rem; color: #666; }
.day { display: flex; align-items: center; gap: 0.75rem; margin: 1.1rem 1rem 0.25rem; color: #555; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.day::before, .day::after { content: ''; flex: 1; border-top: 1px solid #1e1e1e; }
.tail { height: 1px; }
</style>
