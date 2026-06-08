<script setup lang="ts">
import type { MemberView } from '~/types/picks'

const props = defineProps<{
  member: MemberView
  canRemove: boolean
}>()

const emit = defineEmits<{
  remove: [userId: string]
}>()

const confirming = ref(false)

function initiateRemove() {
  confirming.value = true
}

function cancelRemove() {
  confirming.value = false
}

function confirmRemove(userId: string) {
  confirming.value = false
  emit('remove', userId)
}

const initials = computed(() => {
  const parts = props.member.displayName.split(' ')
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase() || '?'
})
</script>

<template>
  <div class="member-row">
    <div class="member-avatar">
      <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="member.displayName" class="avatar-img" />
      <span v-else class="avatar-initials">{{ initials }}</span>
    </div>

    <div class="member-info">
      <span class="member-name">{{ member.displayName }}</span>
      <span class="role-badge" :class="member.role">{{ member.role }}</span>
    </div>

    <div v-if="canRemove" class="member-actions">
      <template v-if="confirming">
        <span class="confirm-text">Remove?</span>
        <button class="action-btn confirm" @click="confirmRemove(member.userId)">Yes</button>
        <button class="action-btn cancel" @click="cancelRemove">No</button>
      </template>
      <button v-else class="action-btn remove" @click="initiateRemove">Remove</button>
    </div>
  </div>
</template>

<style scoped>
.member-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #1a1a1a;
}

.member-row:last-child {
  border-bottom: none;
}

.member-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #2a2a2a;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-initials {
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: #666;
}

.member-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.member-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #e0e0e0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-badge {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
}

.role-badge.owner {
  color: #fbbf24;
  border: 1px solid #fbbf2440;
}

.role-badge.member {
  color: #666;
  border: 1px solid #2a2a2a;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.confirm-text {
  font-size: 0.8rem;
  color: #999;
}

.action-btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.6rem;
  border-radius: 5px;
  border: 1px solid;
  cursor: pointer;
  background: none;
  transition: background 0.15s, color 0.15s;
}

.action-btn.remove {
  color: #f87171;
  border-color: #f8717130;
}

.action-btn.remove:hover {
  background: rgba(248, 113, 113, 0.1);
}

.action-btn.confirm {
  color: #f87171;
  border-color: #f8717150;
}

.action-btn.confirm:hover {
  background: rgba(248, 113, 113, 0.15);
}

.action-btn.cancel {
  color: #666;
  border-color: #2a2a2a;
}

.action-btn.cancel:hover {
  background: #1a1a1a;
  color: #999;
}
</style>
