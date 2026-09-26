<script setup lang="ts">
// Rendered by vue-sonner via toast.custom(); see useChatToasts.
// Mirrors ChatToastProps in ~/types/chat (the SFC compiler can't resolve imported prop types here).
const props = defineProps<{
  kind: 'message' | 'reaction' | 'mention'
  avatarUrl: string | null
  senderName: string
  leagueName: string
  snippet: string
  count?: number
  emoji?: string
  to: string
}>()
const emit = defineEmits<{ closeToast: [] }>()

const headline = computed(() => {
  if (props.kind !== 'reaction') return props.senderName
  const others = (props.count ?? 1) - 1
  if (others <= 0) return props.senderName
  return `${props.senderName} and ${others} ${others === 1 ? 'other' : 'others'}`
})

const action = computed(() => {
  if (props.kind === 'reaction') {
    return (props.count ?? 1) > 1 || !props.emoji ? 'reacted to your message' : `reacted ${props.emoji}`
  }
  return props.kind === 'mention' ? 'mentioned you' : null
})

function open() {
  emit('closeToast')
  navigateTo(props.to)
}
</script>

<template>
  <button type="button" class="chat-toast" :class="kind" @click="open">
    <UserAvatar :name="senderName" :url="avatarUrl" :size="32" />
    <span class="body">
      <span class="line">
        <strong class="sender">{{ headline }}</strong>
        <span v-if="kind !== 'reaction' && (count ?? 1) > 1" class="count">({{ count }})</span>
        <span v-if="action" class="action">{{ action }}</span>
        <span class="league">· {{ leagueName }}</span>
      </span>
      <span class="snippet">{{ snippet }}</span>
    </span>
  </button>
</template>

<style scoped>
.chat-toast {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  width: 100%;
  padding: 0.7rem 2rem 0.7rem 0.8rem;
  background: #161616;
  color: #f0f0f0;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.55);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.chat-toast:hover { background: #1b1b1b; }
.chat-toast.mention { border-color: #fbbf24; box-shadow: 0 0 0 1px #fbbf2440, 0 6px 20px rgb(0 0 0 / 0.55); }
.body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; flex: 1; }
.line { display: flex; align-items: baseline; gap: 0.3rem; font-size: 0.82rem; min-width: 0; white-space: nowrap; }
/* The league name gives way first; the sender only truncates when very long. */
.sender { overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; max-width: 55%; }
.count { color: #aaa; }
.action { color: #bbb; flex-shrink: 0; }
.league { color: #777; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex-shrink: 1; }
.snippet { font-size: 0.85rem; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
