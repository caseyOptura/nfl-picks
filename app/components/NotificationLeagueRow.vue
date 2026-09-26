<script setup lang="ts">
import type { ChatNotificationPrefs } from '~/types/chat'

defineProps<{
  name: string
  prefs: ChatNotificationPrefs
}>()

const emit = defineEmits<{ change: [patch: Partial<ChatNotificationPrefs>] }>()
</script>

<template>
  <div class="league-row">
    <h3 class="league-name">{{ name }}</h3>
    <ToggleSwitch
      :model-value="prefs.muted"
      label="Mute chat"
      hint="No pop-ups or pushes unless you're @mentioned or replied to"
      @update:model-value="emit('change', { muted: $event })"
    />
    <ToggleSwitch
      :model-value="prefs.push_messages"
      label="Push for new messages"
      :disabled="prefs.muted"
      @update:model-value="emit('change', { push_messages: $event })"
    />
    <ToggleSwitch
      :model-value="prefs.push_reactions"
      label="Push when someone reacts to my message"
      :disabled="prefs.muted"
      @update:model-value="emit('change', { push_reactions: $event })"
    />
  </div>
</template>

<style scoped>
.league-row { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #1e1e1e; }
.league-name { margin: 0; font-size: 0.95rem; font-weight: 700; color: #f0f0f0; }
</style>
