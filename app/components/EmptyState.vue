<script setup lang="ts">
defineProps<{ message?: string }>()
</script>

<template>
  <div class="empty-state">
    <p>{{ message ?? 'Nothing to show.' }}</p>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}
</style>
