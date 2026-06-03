<script setup lang="ts">
defineProps<{ tabs: string[]; active: string }>()
const emit = defineEmits<{ (e: 'change', tab: string): void }>()
</script>

<template>
  <div class="tab-bar" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab"
      class="tab"
      :class="{ active: tab === active }"
      role="tab"
      :aria-selected="tab === active"
      @click="emit('change', tab)"
    >
      {{ tab }}
    </button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #222;
  margin-bottom: 1.5rem;
}

.tab {
  padding: 0.6rem 1.25rem;
  background: transparent;
  color: #666;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}

.tab:hover {
  color: #ccc;
}

.tab.active {
  color: #fff;
  border-bottom-color: #fff;
}
</style>
