<script setup lang="ts">
import type { MemberPickSummary } from '~/types/picks'

const props = defineProps<{
  member: Pick<MemberPickSummary, 'displayName' | 'nickname' | 'fullName' | 'avatarUrl'>
}>()
const emit = defineEmits<{ close: [] }>()

// Nickname leads when set, with the real name beneath it; otherwise the
// real name (or "Member") stands alone.
const title = computed(() => props.member.nickname ?? props.member.fullName ?? props.member.displayName)
const subtitle = computed(() =>
  props.member.nickname && props.member.fullName && props.member.fullName !== props.member.nickname
    ? props.member.fullName
    : null,
)

onKeyStroke('Escape', () => emit('close'))
</script>

<template>
  <!-- Teleported and fixed, so it is out of the page layout and can never widen it. -->
  <Teleport to="body">
    <div class="card-backdrop" @click="emit('close')">
      <div class="card" role="dialog" :aria-label="title" @click.stop>
        <UserAvatar :name="member.displayName" :url="member.avatarUrl" :size="72" />
        <p class="title">{{ title }}</p>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.card-backdrop {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgb(0 0 0 / 0.5);
}
.card {
  width: min(16rem, calc(100vw - 2rem));
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  padding: 1.5rem 1rem 1.25rem;
  background: #161616; border: 1px solid #333; border-radius: 12px;
  color: #f0f0f0; text-align: center;
}
.card :deep(.user-avatar) { margin-bottom: 0.5rem; border-color: #444; }
.title, .subtitle {
  margin: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.title { font-size: 1.05rem; font-weight: 700; }
.subtitle { font-size: 0.8rem; color: #8a8a8a; }
</style>
