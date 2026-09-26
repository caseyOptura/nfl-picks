<script setup lang="ts">
import type { MentionOption } from '~/composables/useMentionComposer'

defineProps<{
  options: MentionOption[]
  active: number
}>()

const emit = defineEmits<{
  pick: [option: MentionOption]
  hover: [index: number]
}>()
</script>

<template>
  <ul class="mention-menu" role="listbox" aria-label="Mention a member">
    <li
      v-for="(o, i) in options"
      :id="`mention-opt-${i}`"
      :key="o.id"
      role="option"
      :aria-selected="i === active"
      :class="{ active: i === active }"
      @mousedown.prevent="emit('pick', o)"
      @mouseenter="emit('hover', i)"
    >
      <UserAvatar v-if="o.hint === undefined" :name="o.name" :url="o.avatarUrl" :size="22" />
      <span v-else class="all" aria-hidden="true">@</span>
      <span class="name">{{ o.name }}</span>
      <span v-if="o.hint" class="hint">{{ o.hint }}</span>
    </li>
  </ul>
</template>

<style scoped>
.mention-menu {
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  bottom: calc(100% + 4px);
  max-width: 320px;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
  z-index: 20;
}
li {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.55rem;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #ddd;
  cursor: pointer;
}
li.active { background: #262626; color: #fff; }
.name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hint { font-size: 0.75rem; color: #777; }
.all {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #2a3a52;
  color: #93c5fd;
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
