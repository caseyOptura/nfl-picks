<script setup lang="ts">
defineProps<{ message?: string }>()
</script>

<template>
  <div class="loading-state">
    <div class="spinner" aria-hidden="true" />
    <p v-if="message" class="loading-message">{{ message }}</p>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid #333;
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-message {
  color: #aaa;
  font-size: 0.9rem;
}
</style>
