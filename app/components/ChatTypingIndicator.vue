<script setup lang="ts">
import type { MemberView } from '~/types/picks'

const props = defineProps<{
  typers: MemberView[]
}>()

const label = computed(() => {
  const names = props.typers.map((t) => t.displayName)
  switch (names.length) {
    case 0: return ''
    case 1: return `${names[0]} is typing…`
    case 2: return `${names[0]} and ${names[1]} are typing…`
    case 3: return `${names[0]}, ${names[1]}, and ${names[2]} are typing…`
    default: return `${names[0]}, ${names[1]}, and ${names.length - 2} others are typing…`
  }
})
</script>

<template>
  <!-- Fixed height either way, so the message list never jumps. -->
  <div class="typing" aria-live="polite">
    <template v-if="typers.length">
      <span class="avatars">
        <UserAvatar v-for="t in typers.slice(0, 3)" :key="t.userId" :name="t.displayName" :url="t.avatarUrl" :size="18" />
      </span>
      <span class="dots" aria-hidden="true"><i /><i /><i /></span>
      <span class="label">{{ label }}</span>
    </template>
  </div>
</template>

<style scoped>
.typing {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  height: 24px;
  padding: 0 0.9rem;
  font-size: 0.75rem;
  color: #888;
  overflow: hidden;
}
.avatars { display: flex; flex-shrink: 0; }
.avatars > :not(:first-child) { margin-left: -6px; }
.avatars > * { box-shadow: 0 0 0 2px #0a0a0a; }
.label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dots { display: flex; gap: 3px; flex-shrink: 0; }
.dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #888;
  animation: blink 1.2s infinite ease-in-out;
}
.dots i:nth-child(2) { animation-delay: 0.15s; }
.dots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes blink {
  0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
@media (prefers-reduced-motion: reduce) {
  .dots i { animation: none; opacity: 0.6; }
}
</style>
