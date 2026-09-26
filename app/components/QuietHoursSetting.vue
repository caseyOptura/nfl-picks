<script setup lang="ts">
const emit = defineEmits<{ error: [message: string | null] }>()

const { quiet, loaded, load, save } = useQuietHours()
onMounted(load)

// Keep the last window around so toggling off and on restores it.
const draft = ref({ ...DEFAULT_QUIET_HOURS })
watch(quiet, (q) => {
  if (q) draft.value = { ...q }
}, { immediate: true })

async function toggle(on: boolean) {
  emit('error', await save(on ? { ...draft.value } : null))
}

async function changeTime(field: 'start' | 'end', value: string) {
  if (!value || value === draft.value[field]) return
  draft.value = { ...draft.value, [field]: value }
  if (draft.value.start === draft.value.end) return
  emit('error', await save({ ...draft.value }))
}
</script>

<template>
  <div class="quiet">
    <ToggleSwitch
      :model-value="!!quiet"
      :disabled="!loaded"
      label="Quiet hours"
      hint="Pause push notifications overnight. Pop-ups in the app still show."
      @update:model-value="toggle"
    />
    <div v-if="quiet" class="times">
      <label>
        <span>From</span>
        <input type="time" :value="draft.start" @change="changeTime('start', ($event.target as HTMLInputElement).value)">
      </label>
      <label>
        <span>to</span>
        <input type="time" :value="draft.end" @change="changeTime('end', ($event.target as HTMLInputElement).value)">
      </label>
    </div>
  </div>
</template>

<style scoped>
.quiet { display: flex; flex-direction: column; gap: 0.6rem; }
.times { display: flex; gap: 1rem; flex-wrap: wrap; }
.times label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #999; }
.times input {
  background: #0a0a0a;
  color: #f0f0f0;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  font: inherit;
  font-size: 16px;
  color-scheme: dark;
}
</style>
