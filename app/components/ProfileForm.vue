<script setup lang="ts">
import type { ProfileRow, ProfileUpdate } from '~/types/auth'
import { randomNickname } from '~/composables/funnyNicknames'

const props = defineProps<{
  profile: ProfileRow
  saving: boolean
}>()

const emit = defineEmits<{
  save: [ProfileUpdate]
}>()

const firstName = ref(props.profile.first_name ?? '')
const lastName = ref(props.profile.last_name ?? '')
const nickname = ref(props.profile.nickname ?? randomNickname(props.profile.first_name))

watch(
  () => props.profile,
  (p) => {
    firstName.value = p.first_name ?? ''
    lastName.value = p.last_name ?? ''
    nickname.value = p.nickname ?? randomNickname(p.first_name)
  }
)

function shuffleNickname() {
  nickname.value = randomNickname(firstName.value || null)
}

function handleSave() {
  emit('save', {
    first_name: firstName.value || null,
    last_name: lastName.value || null,
    nickname: nickname.value,
  })
}
</script>

<template>
  <form class="profile-form" @submit.prevent="handleSave">
    <FormField label="First Name">
      <input v-model="firstName" type="text" class="input" autocomplete="given-name" />
    </FormField>

    <FormField label="Last Name">
      <input v-model="lastName" type="text" class="input" autocomplete="family-name" />
    </FormField>

    <FormField label="Nickname">
      <div class="nickname-row">
        <input v-model="nickname" type="text" class="input" required />
        <button type="button" class="shuffle-btn" @click="shuffleNickname">Shuffle</button>
      </div>
    </FormField>

    <button type="submit" class="save-btn" :disabled="saving">
      {{ saving ? 'Saving…' : 'Save' }}
    </button>
  </form>
</template>

<style scoped>
.profile-form {
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

.nickname-row {
  display: flex;
  gap: 0.5rem;
}

.shuffle-btn {
  padding: 0.65rem 0.75rem;
  background: #222;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ccc;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.shuffle-btn:hover {
  background: #2a2a2a;
}

.save-btn {
  padding: 0.7rem;
  background: #fff;
  color: #0a0a0a;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
