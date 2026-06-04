<script setup lang="ts">
defineProps<{
  label: string
  error?: string
}>()
</script>

<template>
  <div class="form-field">
    <label class="field-label">{{ label }}</label>
    <slot />
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.field-error {
  font-size: 0.8rem;
  color: #f87171;
}
</style>
