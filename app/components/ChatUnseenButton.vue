<script setup lang="ts">
defineProps<{ count: number }>()
</script>

<template>
  <button type="button" class="unseen">
    ↓ {{ count }} new {{ count === 1 ? 'message' : 'messages' }}
  </button>
</template>

<style scoped>
.unseen {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  background: #f0f0f0;
  color: #0a0a0a;
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.5);
}
</style>
