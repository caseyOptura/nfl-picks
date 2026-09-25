<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const leagueId = route.params.id as string

const { league, members, isOwner, pending, error: leagueError, refresh } = useLeague(leagueId)
const chat = useLeagueChat(leagueId, members, isOwner)

const sendError = ref<string | null>(null)

const nameFor = (userId: string) => members.value.find((m) => m.userId === userId)?.displayName

async function handleSend(body: string) {
  sendError.value = await chat.send(body)
}

async function handleRetry(clientId: string) {
  sendError.value = await chat.retry(clientId)
}

useHead({ title: () => (league.value ? `${league.value.name} · Chat` : 'Chat') })
</script>

<template>
  <main class="chat-page">
    <header class="chat-header">
      <NuxtLink :to="`/leagues/${leagueId}`" class="back" aria-label="Back to league">‹</NuxtLink>
      <div class="title">
        <h1>{{ league?.name ?? 'League chat' }}</h1>
        <span v-if="members.length" class="sub">{{ members.length }} members</span>
      </div>
    </header>

    <ErrorState v-if="leagueError" :message="leagueError.message" @retry="refresh" />
    <ErrorState v-else-if="chat.error.value && !chat.messages.value.length" :message="chat.error.value" @retry="chat.reload" />
    <LoadingState v-else-if="pending && !league" message="Loading chat…" />

    <template v-else>
      <ChatMessageList
        :messages="chat.messages.value"
        :loading="chat.loading.value"
        :loading-older="chat.loadingOlder.value"
        :has-more="chat.hasMore.value"
        :name-for="nameFor"
        @load-older="chat.loadOlder"
        @retry="handleRetry"
        @discard="chat.discard"
      />
      <p v-if="sendError" class="send-error" role="alert">{{ sendError }}</p>
      <ChatComposer @send="handleSend" />
    </template>
  </main>
</template>

<style scoped>
/* Fill the viewport below the sticky nav so only the message list scrolls. */
.chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - var(--app-nav-height, 61px));
  max-width: 720px;
  margin: 0 auto;
  border-left: 1px solid #161616;
  border-right: 1px solid #161616;
}
.chat-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #1e1e1e;
  background: #0d0d0d;
}
.back { color: #999; text-decoration: none; font-size: 1.6rem; line-height: 1; padding: 0 0.35rem; }
.back:hover { color: #fff; }
.title { display: flex; flex-direction: column; min-width: 0; }
.title h1 { font-size: 1rem; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sub { font-size: 0.75rem; color: #666; }
.send-error { font-size: 0.8rem; color: #f87171; padding: 0.35rem 0.9rem; background: #111; }
</style>
