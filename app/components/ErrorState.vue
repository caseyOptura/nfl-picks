<script setup lang="ts">
defineProps<{ message?: string }>()
const emit = defineEmits<{ retry: [] }>()
function handleRetry() {
  emit('retry')
}
</script>

<template>
  <div class="error-state">
    <p class="error-message">{{ message ?? 'Something went wrong.' }}</p>
    <button class="retry-btn" @click="handleRetry">Try again</button>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
  text-align: center;
}

.error-message {
  color: #f87171;
  font-size: 0.95rem;
}

.retry-btn {
  padding: 0.5rem 1.25rem;
  background: #222;
  color: #fff;
  border: 1px solid #444;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
}

.retry-btn:hover {
  background: #333;
}
</style>
