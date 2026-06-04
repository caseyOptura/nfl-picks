<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { userId, updatePassword } = useAuth()
const { profile, pending, error, updateProfile } = useProfile()

const savingProfile = ref(false)
const profileFeedback = ref<{ ok: boolean; message: string } | null>(null)

const savingPassword = ref(false)
const passwordFeedback = ref<{ ok: boolean; message: string } | null>(null)

function showFeedback(
  target: Ref<{ ok: boolean; message: string } | null>,
  ok: boolean,
  message: string
) {
  target.value = { ok, message }
  setTimeout(() => { target.value = null }, 3000)
}

async function handleAvatarUploaded(url: string) {
  const result = await updateProfile({ avatar_url: url })
  showFeedback(profileFeedback, result.ok, result.ok ? 'Avatar saved!' : result.error ?? 'Failed to save')
}

async function handleProfileSave(patch: Parameters<typeof updateProfile>[0]) {
  savingProfile.value = true
  const result = await updateProfile(patch)
  savingProfile.value = false
  showFeedback(profileFeedback, result.ok, result.ok ? 'Profile saved!' : result.error ?? 'Failed to save')
}

async function handlePasswordChange({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) {
  savingPassword.value = true
  const result = await updatePassword(currentPassword, newPassword)
  savingPassword.value = false
  showFeedback(passwordFeedback, result.ok, result.ok ? 'Password updated!' : result.error ?? 'Failed to update')
}
</script>

<template>
  <main class="profile-page">
    <h1 class="page-title">Your Profile</h1>

    <LoadingState v-if="pending" message="Loading profile…" />
    <ErrorState v-else-if="error" :message="error.message" />
    <p v-else-if="!profile" class="no-profile">Profile not found. Please contact support.</p>

    <template v-else-if="profile && userId">
      <section class="profile-section">
        <h2 class="section-title">Avatar</h2>
        <AvatarUploader
          :avatar-url="profile.avatar_url"
          :user-id="userId"
          @uploaded="handleAvatarUploaded"
        />
        <p v-if="profileFeedback" :class="profileFeedback.ok ? 'feedback-ok' : 'feedback-error'">
          {{ profileFeedback.message }}
        </p>
      </section>

      <section class="profile-section">
        <h2 class="section-title">Profile Info</h2>
        <ProfileForm
          :profile="profile"
          :saving="savingProfile"
          @save="handleProfileSave"
        />
      </section>

      <section class="profile-section">
        <h2 class="section-title">Change Password</h2>
        <PasswordChangeForm @change="handlePasswordChange" />
        <p v-if="passwordFeedback" :class="passwordFeedback.ok ? 'feedback-ok' : 'feedback-error'">
          {{ passwordFeedback.message }}
        </p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.profile-page {
  max-width: 540px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.page-title {
  margin-bottom: 0;
}

.profile-section {
  background: #111;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin-bottom: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #666;
}

.feedback-ok {
  font-size: 0.85rem;
  color: #4ade80;
}

.feedback-error {
  font-size: 0.85rem;
  color: #f87171;
}

.no-profile {
  color: #f87171;
  font-size: 0.95rem;
  text-align: center;
  padding: 2rem 0;
}
</style>
