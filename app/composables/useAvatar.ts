export function useAvatar() {
  const client = useSupabaseClient()
  const { userId } = useAuth()
  const uploading = ref(false)
  const error = ref<string | null>(null)

  async function uploadAvatar(file: File): Promise<{ url: string | null; error: string | null }> {
    error.value = null

    if (!file.type.startsWith('image/')) {
      error.value = 'File must be an image'
      return { url: null, error: error.value }
    }
    if (file.size > 10 * 1024 * 1024) {
      error.value = 'File must be under 10 MB'
      return { url: null, error: error.value }
    }
    if (!userId.value) {
      error.value = 'Not logged in'
      return { url: null, error: error.value }
    }

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId.value}/avatar.${ext}`

    uploading.value = true
    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    uploading.value = false

    if (uploadError) {
      error.value = uploadError.message
      return { url: null, error: error.value }
    }

    const { data } = client.storage.from('avatars').getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  }

  return { uploading, error, uploadAvatar }
}
