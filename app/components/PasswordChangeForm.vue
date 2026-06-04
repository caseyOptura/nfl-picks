<script setup lang="ts">
const emit = defineEmits<{
  change: [{ currentPassword: string; newPassword: string }]
}>()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const mismatch = ref(false)

function handleSubmit() {
  if (newPassword.value !== confirmPassword.value) {
    mismatch.value = true
    return
  }
  mismatch.value = false
  emit('change', { currentPassword: currentPassword.value, newPassword: newPassword.value })
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

watch([newPassword, confirmPassword], () => {
  mismatch.value = false
})
</script>

<template>
  <form class="pw-form" @submit.prevent="handleSubmit">
    <FormField label="Current Password">
      <input
        v-model="currentPassword"
        type="password"
        class="input"
        autocomplete="current-password"
        required
      />
    </FormField>

    <FormField label="New Password">
      <input
        v-model="newPassword"
        type="password"
        class="input"
        autocomplete="new-password"
        required
      />
    </FormField>

    <FormField label="Confirm New Password" :error="mismatch ? 'Passwords do not match' : undefined">
      <input
        v-model="confirmPassword"
        type="password"
        class="input"
        autocomplete="new-password"
        required
      />
    </FormField>

    <button
      type="submit"
      class="submit-btn"
      :disabled="mismatch || !currentPassword || !newPassword || !confirmPassword"
    >
      Change Password
    </button>
  </form>
</template>

<style scoped>
.pw-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  background: #111;
  border: 1px solid #333;
  border-radius: 6px;
  color: #f0f0f0;
  font-size: 0.95rem;
}

.input:focus {
  outline: none;
  border-color: #555;
}

.submit-btn {
  padding: 0.7rem;
  background: #222;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ccc;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
