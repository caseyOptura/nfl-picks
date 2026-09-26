<script setup lang="ts">
import type { ChatNotificationPrefs } from '~/types/chat'

const push = usePushNotifications()
const prefs = useChatPrefs()
const { leagues, pending } = useLeagues()
const feedback = ref<string | null>(null)

onMounted(() => {
  push.refresh()
  prefs.load()
})

async function toggleDevice() {
  feedback.value = push.isSubscribed.value ? await push.disable() : await push.enable()
}

async function change(leagueId: string, patch: Partial<ChatNotificationPrefs>) {
  feedback.value = await prefs.update(leagueId, patch)
}
</script>

<template>
  <div class="notification-settings">
    <div class="device">
      <p v-if="push.needsIosInstall" class="note">
        On iPhone or iPad, tap <strong>Share → Add to Home Screen</strong>, then open NFL Picks from your Home Screen
        to turn on notifications.
      </p>
      <p v-else-if="!push.isSupported" class="note">This browser doesn't support push notifications.</p>
      <p v-else-if="push.permission.value === 'denied'" class="note">
        Notifications are blocked for this site. Allow them in your browser settings, then reload.
      </p>
      <template v-else>
        <div class="device-row">
          <span class="device-text">
            <span class="label">Push notifications on this device</span>
            <span class="hint">{{ push.isSubscribed.value ? 'On' : 'Off' }} for this browser only</span>
          </span>
          <button type="button" class="device-btn" :class="{ on: push.isSubscribed.value }" :disabled="push.busy.value" @click="toggleDevice">
            {{ push.busy.value ? '…' : push.isSubscribed.value ? 'Turn off' : 'Turn on' }}
          </button>
        </div>
      </template>
    </div>

    <p v-if="feedback" class="feedback" role="alert">{{ feedback }}</p>

    <p v-if="pending && !leagues.length" class="note">Loading leagues…</p>
    <p v-else-if="!leagues.length" class="note">Join a league to set chat notifications.</p>
    <NotificationLeagueRow
      v-for="l in leagues"
      :key="l.id"
      :name="l.name"
      :prefs="prefs.prefsFor(l.id)"
      @change="change(l.id, $event)"
    />
  </div>
</template>

<style scoped>
.notification-settings { display: flex; flex-direction: column; gap: 1rem; }
.device-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.device-text { display: flex; flex-direction: column; gap: 0.15rem; }
.label { font-size: 0.9rem; color: #e5e5e5; }
.hint { font-size: 0.75rem; color: #777; }
.device-btn {
  flex-shrink: 0;
  padding: 0.5rem 0.9rem;
  background: #fff;
  color: #0a0a0a;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}
.device-btn.on { background: #222; color: #ccc; border: 1px solid #333; }
.device-btn:disabled { opacity: 0.6; cursor: default; }
.note { margin: 0; font-size: 0.85rem; color: #999; line-height: 1.45; }
.feedback { margin: 0; font-size: 0.85rem; color: #f87171; }
</style>
