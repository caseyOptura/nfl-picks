<script setup lang="ts">
defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  created: [id: string]
}>()

const { createLeague } = useLeagues()

const name = ref('')
const seasonYear = ref(new Date().getFullYear())
const submitting = ref(false)
const formError = ref<string | null>(null)

async function handleSubmit() {
  if (!name.value.trim()) {
    formError.value = 'League name is required'
    return
  }
  submitting.value = true
  formError.value = null
  const result = await createLeague({ name: name.value.trim(), season_year: seasonYear.value })
  submitting.value = false
  if (!result.ok || !result.id) {
    formError.value = result.error ?? 'Failed to create league'
    return
  }
  name.value = ''
  emit('created', result.id)
}

function handleBackdropClick() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click="handleBackdropClick">
      <div class="modal" role="dialog" aria-modal="true" @click.stop>
        <div class="modal-header">
          <h2>Create League</h2>
          <button class="close-btn" aria-label="Close" @click="emit('close')">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <FormField label="League Name">
            <input
              v-model="name"
              type="text"
              class="input"
              placeholder="e.g. Sunday Crew"
              maxlength="80"
            />
          </FormField>

          <FormField label="Season Year">
            <input
              v-model.number="seasonYear"
              type="number"
              class="input"
              :min="2020"
              :max="2040"
            />
          </FormField>

          <p v-if="formError" class="form-error">{{ formError }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="emit('close')">Cancel</button>
          <button class="btn-primary" :disabled="submitting" @click="handleSubmit">
            {{ submitting ? 'Creating…' : 'Create League' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: #111; border: 1px solid #2a2a2a; border-radius: 12px; width: 100%; max-width: 420px; overflow: hidden; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.25rem 0; }
.modal-header h2 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #f0f0f0; }
.close-btn { background: none; border: none; cursor: pointer; color: #666; padding: 4px; display: flex; align-items: center; border-radius: 4px; transition: color 0.15s; }
.close-btn:hover { color: #ccc; }
.modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.input { width: 100%; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0f0f0; font-size: 0.95rem; padding: 0.6rem 0.75rem; outline: none; transition: border-color 0.15s; }
.input:focus { border-color: #555; }
.form-error { font-size: 0.85rem; color: #f87171; }
.modal-footer { display: flex; gap: 0.75rem; justify-content: flex-end; padding: 0 1.25rem 1.25rem; }
.btn-secondary { padding: 0.55rem 1.1rem; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 7px; color: #999; font-size: 0.9rem; cursor: pointer; transition: background 0.15s, color 0.15s; }
.btn-secondary:hover { background: #222; color: #ccc; }
.btn-primary { padding: 0.55rem 1.25rem; background: #fff; border: none; border-radius: 7px; color: #0a0a0a; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary:not(:disabled):hover { opacity: 0.9; }
</style>
