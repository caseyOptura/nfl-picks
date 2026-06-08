<script setup lang="ts">
const props = defineProps<{
  photoUrl: string | null
  leagueId: string
}>()

const emit = defineEmits<{
  uploaded: [url: string]
}>()

const client = useSupabaseClient()

const uploading = ref(false)
const uploadError = ref<string | null>(null)
const selectedFile = ref<File | null>(null)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  uploadError.value = null
}

async function handleUpload() {
  if (!selectedFile.value || !props.leagueId) return
  const file = selectedFile.value
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'File must be an image'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    uploadError.value = 'File must be under 10 MB'
    return
  }
  uploading.value = true
  uploadError.value = null
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${props.leagueId}/photo.${ext}`
  const { error: storageError } = await client.storage
    .from('league-photos')
    .upload(path, file, { upsert: true })
  if (storageError) {
    uploadError.value = storageError.message
    uploading.value = false
    return
  }
  const { data } = client.storage.from('league-photos').getPublicUrl(path)
  uploading.value = false
  selectedFile.value = null
  emit('uploaded', data.publicUrl)
}
</script>

<template>
  <div class="photo-uploader">
    <div class="photo-preview">
      <img v-if="photoUrl" :src="photoUrl" alt="League photo" class="photo-img" />
      <div v-else class="photo-placeholder">
        <svg viewBox="0 0 20 20" fill="currentColor" width="24" height="24">
          <path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>

    <div class="upload-controls">
      <input type="file" accept="image/*" class="file-input" @change="handleFileChange" />
      <button
        class="upload-btn"
        :disabled="uploading || !selectedFile"
        @click="handleUpload"
      >
        {{ uploading ? 'Uploading…' : photoUrl ? 'Change Photo' : 'Upload Photo' }}
      </button>
    </div>

    <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>
  </div>
</template>

<style scoped>
.photo-uploader {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.photo-preview {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #2a2a2a;
  background: #1a1a1a;
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #444;
}

.upload-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.file-input {
  font-size: 0.85rem;
  color: #888;
}

.upload-btn {
  padding: 0.45rem 0.9rem;
  background: #222;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ccc;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}

.upload-btn:hover:not(:disabled) {
  background: #2a2a2a;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-error {
  font-size: 0.8rem;
  color: #f87171;
}
</style>
