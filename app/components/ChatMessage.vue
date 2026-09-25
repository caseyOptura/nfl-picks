<script setup lang="ts">
import type { ChatMessageView } from '~/types/chat'

const props = defineProps<{
  message: ChatMessageView
  grouped: boolean
  nameFor: (userId: string) => string | undefined
}>()

const emit = defineEmits<{
  retry: [clientId: string]
  discard: [clientId: string]
}>()

const segments = computed(() => messageSegments(props.message.body, props.nameFor))

const time = computed(() =>
  new Date(props.message.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
)

const deletedLabel = computed(() =>
  props.message.deletedBy && props.message.deletedBy !== props.message.userId
    ? 'Removed by the league owner'
    : 'Message deleted',
)
</script>

<template>
  <div v-if="message.kind === 'system'" class="system-msg" role="note">
    <span>{{ message.body }}</span>
    <time :datetime="message.createdAt">{{ time }}</time>
  </div>

  <div
    v-else
    class="msg"
    :class="{ mine: message.mine, grouped, mentioned: message.mentionsMe, pending: message.status === 'pending' }"
  >
    <div class="avatar-col">
      <UserAvatar v-if="!grouped && !message.mine" :name="message.displayName" :url="message.avatarUrl" :size="32" />
    </div>

    <div class="content">
      <div v-if="!grouped" class="meta">
        <span v-if="!message.mine" class="name">{{ message.displayName }}</span>
        <time :datetime="message.createdAt">{{ time }}</time>
      </div>

      <div class="bubble" :title="grouped ? time : undefined">
        <em v-if="message.deletedAt" class="deleted">{{ deletedLabel }}</em>
        <template v-else>
          <template v-for="(seg, i) in segments" :key="i">
            <a v-if="seg.type === 'link'" :href="seg.href" target="_blank" rel="noopener noreferrer nofollow">{{ seg.text }}</a>
            <span v-else-if="seg.type === 'mention'" class="mention">{{ seg.text }}</span>
            <template v-else>{{ seg.text }}</template>
          </template>
          <span v-if="message.editedAt" class="edited">(edited)</span>
        </template>
      </div>

      <div v-if="message.status === 'failed'" class="failed">
        Not sent.
        <button type="button" @click="emit('retry', message.clientId)">Retry</button>
        <button type="button" @click="emit('discard', message.clientId)">Discard</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg { display: flex; gap: 0.5rem; padding: 0 0.75rem; margin-top: 0.75rem; }
.msg.grouped { margin-top: 0.15rem; }
.msg.mine { flex-direction: row-reverse; }
.msg.pending { opacity: 0.55; }

.avatar-col { width: 32px; flex-shrink: 0; }
.msg.mine .avatar-col { display: none; }

.content { display: flex; flex-direction: column; gap: 0.2rem; max-width: min(80%, 480px); min-width: 0; }
.msg.mine .content { align-items: flex-end; }

.meta { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.75rem; color: #666; }
.name { font-weight: 700; color: #ccc; }

.bubble {
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 0.45rem 0.7rem;
  font-size: 0.92rem;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.msg.mine .bubble { background: #1f2a3a; border-color: #2a3a52; }
.msg.mentioned .bubble { border-color: #fbbf24; }

.bubble a { color: #93c5fd; }
.mention { color: #93c5fd; font-weight: 600; }
.edited { margin-left: 0.35rem; font-size: 0.72rem; color: #666; }
.deleted { color: #666; }

.failed { font-size: 0.75rem; color: #f87171; display: flex; gap: 0.5rem; align-items: center; }
.failed button { background: none; border: none; color: #f0f0f0; text-decoration: underline; cursor: pointer; font-size: 0.75rem; }

.system-msg {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  align-items: baseline;
  margin: 0.9rem 1rem 0.2rem;
  font-size: 0.8rem;
  color: #9a9a9a;
  text-align: center;
}
.system-msg time { font-size: 0.7rem; color: #555; }
</style>
