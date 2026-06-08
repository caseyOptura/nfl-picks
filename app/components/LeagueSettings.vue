<script setup lang="ts">
const props = defineProps<{
  leagueId: string
  name: string
  seasonYear: number
  photoUrl?: string | null
  onSave: (patch: { name: string; season_year: number }) => Promise<{ ok: boolean; error: string | null }>
  onPhotoUploaded: (url: string) => void
}>()

const editName = ref(props.name)
const editYear = ref(props.seasonYear)
const saving = ref(false)
const feedback = ref<{ ok: boolean; message: string } | null>(null)

watch(() => [props.name, props.seasonYear], ([n, y]) => {
  editName.value = n as string
  editYear.value = y as number
})

async function handleSave() {
  saving.value = true
  feedback.value = null
  const result = await props.onSave({ name: editName.value.trim(), season_year: editYear.value })
  saving.value = false
  feedback.value = { ok: result.ok, message: result.ok ? 'Saved!' : result.error ?? 'Failed to save' }
  setTimeout(() => { feedback.value = null }, 3000)
}
</script>

<template>
  <section class="section">
    <h2>League Settings</h2>
    <LeaguePhotoUploader :photo-url="photoUrl" :league-id="leagueId" @uploaded="onPhotoUploaded" />
    <div class="edit-form">
      <FormField label="League Name">
        <input v-model="editName" type="text" class="input" maxlength="80" />
      </FormField>
      <FormField label="Season Year">
        <input v-model.number="editYear" type="number" class="input" :min="2020" :max="2040" />
      </FormField>
      <div class="save-row">
        <button class="btn-save" :disabled="saving" @click="handleSave">{{ saving ? 'Saving…' : 'Save' }}</button>
        <span v-if="feedback" :class="feedback.ok ? 'ok' : 'err'">{{ feedback.message }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.section { background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.section h2 { margin-bottom: 0; }
.edit-form { display: flex; flex-direction: column; gap: 0.75rem; }
.input { width: 100%; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0f0f0; font-size: 0.95rem; padding: 0.6rem 0.75rem; outline: none; transition: border-color 0.15s; }
.input:focus { border-color: #555; }
.save-row { display: flex; align-items: center; gap: 0.75rem; }
.btn-save { padding: 0.5rem 1.1rem; background: #fff; border: none; border-radius: 6px; color: #0a0a0a; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
.btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-save:not(:disabled):hover { opacity: 0.88; }
.ok { font-size: 0.85rem; color: #4ade80; }
.err { font-size: 0.85rem; color: #f87171; }
</style>
