<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
  hint?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <label class="toggle" :class="{ disabled }">
    <span class="text">
      <span class="label">{{ label }}</span>
      <span v-if="hint" class="hint">{{ hint }}</span>
    </span>
    <button
      type="button"
      role="switch"
      class="switch"
      :class="{ on: modelValue }"
      :aria-checked="modelValue"
      :aria-label="label"
      :disabled="disabled"
      @click="emit('update:modelValue', !modelValue)"
    >
      <span class="knob" />
    </button>
  </label>
</template>

<style scoped>
.toggle { display: flex; align-items: center; justify-content: space-between; gap: 1rem; cursor: pointer; }
.toggle.disabled { cursor: default; opacity: 0.45; }
.text { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.label { font-size: 0.9rem; color: #e5e5e5; }
.hint { font-size: 0.75rem; color: #777; }
.switch {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid #333;
  background: #222;
  cursor: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.switch.on { background: #2563eb; border-color: #3b82f6; }
.switch:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #f0f0f0;
  transition: transform 0.15s;
}
.switch.on .knob { transform: translateX(18px); }
</style>
