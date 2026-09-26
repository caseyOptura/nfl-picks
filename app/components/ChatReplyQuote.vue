<script setup lang="ts">
import type { ChatReplyPreview } from '~/types/chat'

defineProps<{ reply: ChatReplyPreview }>()
</script>

<template>
  <button type="button" class="quote" :aria-label="`Jump to ${reply.name}'s message`">
    <span class="name">{{ reply.name }}</span>
    <em v-if="reply.deleted">Message deleted</em>
    <span v-else class="text">{{ reply.snippet }}</span>
  </button>
</template>

<style scoped>
.quote {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  max-width: 100%;
  background: #121212;
  border: none;
  border-left: 2px solid #3b4a60;
  border-radius: 4px;
  padding: 0.25rem 0.55rem;
  font: inherit;
  font-size: 0.75rem;
  color: #888;
  text-align: left;
  cursor: pointer;
}
.quote:hover { background: #171717; }
.name { font-weight: 700; color: #aaa; }
.text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
</style>
