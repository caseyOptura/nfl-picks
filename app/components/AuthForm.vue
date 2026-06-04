<script setup lang="ts">
defineProps<{
  submitLabel: string
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [{ email: string; password: string }]
}>()

const email = ref('')
const password = ref('')

function handleSubmit() {
  emit('submit', { email: email.value, password: password.value })
}
</script>

<template>
  <form class="auth-form" @submit.prevent="handleSubmit">
    <FormField label="Email">
      <input
        v-model="email"
        type="email"
        class="input"
        autocomplete="email"
        required
      />
    </FormField>

    <FormField label="Password">
      <input
        v-model="password"
        type="password"
        class="input"
        autocomplete="current-password"
        required
      />
    </FormField>

    <p v-if="error" class="form-error">{{ error }}</p>

    <button type="submit" class="submit-btn" :disabled="loading">
      {{ loading ? 'Please wait…' : submitLabel }}
    </button>
  </form>
</template>

<style scoped>
.auth-form {
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

.form-error {
  font-size: 0.85rem;
  color: #f87171;
}

.submit-btn {
  padding: 0.7rem;
  background: #fff;
  color: #0a0a0a;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
