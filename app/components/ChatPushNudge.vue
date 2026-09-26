<script setup lang="ts">
// One-time, dismissible prompt shown on the chat page after the user's first
// message. The browser permission prompt only appears when they tap "Turn on".
const DISMISS_KEY = 'chat-push-nudge-dismissed'

const push = usePushNotifications()
const dismissed = useLocalStorage(DISMISS_KEY, false)
const error = ref<string | null>(null)

const show = computed(() =>
  push.isSupported && !dismissed.value && !push.isSubscribed.value && push.permission.value === 'default',
)

async function enable() {
  error.value = await push.enable()
  if (!error.value) dismissed.value = true
}
</script>

<template>
  <div v-if="show" class="nudge" role="status">
    <span class="text">{{ error ?? 'Get notified when your league chats?' }}</span>
    <button type="button" class="on" :disabled="push.busy.value" @click="enable">Turn on</button>
    <button type="button" class="close" aria-label="Dismiss" @click="dismissed = true">✕</button>
  </div>
</template>

<style scoped>
.nudge {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0 0.75rem 0.4rem;
  padding: 0.5rem 0.5rem 0.5rem 0.8rem;
  background: #111827;
  border: 1px solid #1e3a5f;
  border-radius: 10px;
  font-size: 0.82rem;
  color: #cbd5e1;
}
.text { flex: 1; min-width: 0; }
.on {
  background: #f0f0f0;
  color: #0a0a0a;
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.7rem;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.on:disabled { opacity: 0.6; }
.close { background: none; border: none; color: #64748b; font-size: 0.9rem; cursor: pointer; padding: 0.2rem 0.35rem; }
.close:hover { color: #e2e8f0; }
</style>
