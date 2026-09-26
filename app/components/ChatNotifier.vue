<script setup lang="ts">
import type { MessageCreatedEvent, ReactionReceivedEvent } from '~/types/chat'

// Renderless. Mounted once in app.vue while logged in: turns hub events into
// toasts and unread counts for chats the user isn't looking at.

const SNIPPET_MAX = 80

const route = useRoute()
const { userId } = useAuth()
const hub = useChatRealtime()
const unread = useChatUnread()
const toasts = useChatToasts()
const visibility = useDocumentVisibility()
const prefs = useChatPrefs()

// messageId → distinct reactor ids, for the currently open reaction toast.
const reactors = new Map<number, string[]>()

// Mentions are stored as @[Name](uuid); show them as @Name.
function snippet(body: string) {
  const text = body.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/g, '@$1').replace(/\s+/g, ' ').trim()
  return text.length > SNIPPET_MAX ? `${text.slice(0, SNIPPET_MAX - 1)}…` : text
}

const chatPath = (leagueId: string) => `/leagues/${leagueId}/chat`
const isWatching = (leagueId: string) => route.path === chatPath(leagueId) && visibility.value === 'visible'

function onMessage(e: MessageCreatedEvent) {
  const me = userId.value
  if (!me || e.userId === me) return
  if (isWatching(e.leagueId)) return

  unread.bump(e.leagueId)

  // Picks Bot posts silently for now; PR 5 adds the lock reminders that toast.
  if (e.kind === 'system') return

  const mentioned = e.mentionedUserIds.includes(me)
  if (prefs.isMuted(e.leagueId) && !mentioned) return

  toasts.show(`msg:${e.leagueId}:${e.userId}`, {
    kind: mentioned ? 'mention' : 'message',
    avatarUrl: e.senderAvatarUrl,
    senderName: e.senderName,
    leagueName: e.leagueName,
    snippet: snippet(e.body),
    to: chatPath(e.leagueId),
  }, { group: true })
}

function onReaction(e: ReactionReceivedEvent) {
  if (e.reactorId === userId.value || isWatching(e.leagueId)) return
  if (prefs.isMuted(e.leagueId)) return

  const id = `react:${e.messageId}`
  const seen = toasts.isOpen(id) ? reactors.get(e.messageId) ?? [] : []
  const list = seen.includes(e.reactorId) ? seen : [...seen, e.reactorId]
  reactors.set(e.messageId, list)

  toasts.show(id, {
    kind: 'reaction',
    avatarUrl: e.reactorAvatarUrl,
    senderName: e.reactorName,
    leagueName: e.leagueName,
    snippet: snippet(e.snippet),
    emoji: e.emoji,
    count: list.length,
    to: chatPath(e.leagueId),
  })
}

hub.onScoped('message_created', onMessage)
hub.onScoped('reaction_received', onReaction)

// A new league (joined or created) needs its row in the counts.
watch(hub.leagueIds, () => unread.load())

watch(visibility, (v) => {
  if (v === 'visible') {
    unread.load()
    prefs.load()
  }
})

onMounted(() => {
  unread.load()
  prefs.load()
})

onUnmounted(() => {
  toasts.dismissAll()
  unread.reset()
  prefs.reset()
})
</script>

<template>
  <span hidden />
</template>
