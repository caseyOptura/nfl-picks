<script setup lang="ts">
const props = defineProps<{
  avatarUrl: string | null
  userId: string
}>()

const emit = defineEmits<{
  uploaded: [string]
}>()

const { uploading, error: uploadError, uploadAvatar } = useAvatar()
const localError = ref<string | null>(null)
const selectedFile = ref<File | null>(null)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  localError.value = null
  selectedFile.value = file
}

async function handleUpload() {
  if (!selectedFile.value) return
  const result = await uploadAvatar(selectedFile.value)
  if (result.error) {
    localError.value = result.error
    return
  }
  if (result.url) {
    emit('uploaded', result.url)
    selectedFile.value = null
  }
}
</script>

<template>
  <div class="avatar-uploader">
    <div class="avatar-preview">
      <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="avatar-img" />
      <div v-else class="avatar-fallback">?</div>
    </div>

    <div class="upload-controls">
      <input
        type="file"
        accept="image/*"
        class="file-input"
        @change="handleFileChange"
      />
      <button
        class="upload-btn"
        :disabled="uploading || !selectedFile"
        @click="handleUpload"
      >
        {{ uploading ? 'Uploading…' : 'Upload' }}
      </button>
    </div>

    <p v-if="localError || uploadError" class="upload-error">
      {{ localError ?? uploadError }}
    </p>
  </div>
</template>

<style scoped>
.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.avatar-preview {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #333;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 1.5rem;
  font-weight: 700;
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
  padding: 0.5rem 1rem;
  background: #222;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ccc;
  font-size: 0.85rem;
  cursor: pointer;
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
