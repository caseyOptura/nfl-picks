<script setup lang="ts">
import type { PendingInvitation } from '~/composables/useInvitations'

const props = defineProps<{
  onInvite: (email: string) => Promise<{ ok: boolean; alreadyMember: boolean; error: string | null }>
  onResend: (invitationId: string) => Promise<{ ok: boolean; error: string | null }>
  invitations: PendingInvitation[]
}>()

const email = ref('')
const submitting = ref(false)
const result = ref<{ ok: boolean; alreadyMember: boolean; error: string | null } | null>(null)
const lastEmail = ref('')

const resendStates = ref<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({})

async function handleSubmit() {
  const trimmed = email.value.trim()
  if (!trimmed) return
  submitting.value = true
  result.value = null
  lastEmail.value = trimmed
  result.value = await props.onInvite(trimmed)
  submitting.value = false
  if (result.value.ok) email.value = ''
}

async function handleResend(id: string) {
  resendStates.value[id] = 'sending'
  const res = await props.onResend(id)
  resendStates.value[id] = res.ok ? 'sent' : 'error'
  if (res.ok) setTimeout(() => { resendStates.value[id] = 'idle' }, 3000)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="invite-form">
    <h2>Invite a Member</h2>
    <div class="form-row">
      <input
        v-model="email"
        type="email"
        class="email-input"
        placeholder="friend@example.com"
        :disabled="submitting"
        @keydown.enter="handleSubmit"
      />
      <button class="invite-btn" :disabled="submitting || !email.trim()" @click="handleSubmit">
        {{ submitting ? 'Sending…' : 'Invite' }}
      </button>
    </div>

    <p v-if="result?.ok && !result.alreadyMember" class="feedback success">
      Invitation sent to {{ lastEmail }}
    </p>
    <p v-else-if="result?.ok && result.alreadyMember" class="feedback info">
      {{ lastEmail }} is already in this league
    </p>
    <p v-else-if="result && !result.ok" class="feedback error">
      {{ result.error }}
    </p>

    <div v-if="invitations.length > 0" class="pending-list">
      <p class="pending-label">Pending invitations</p>
      <div v-for="inv in invitations" :key="inv.id" class="pending-row">
        <span class="pending-email">{{ inv.email }}</span>
        <span class="pending-date">{{ formatDate(inv.created_at) }}</span>
        <button
          class="resend-btn"
          :disabled="resendStates[inv.id] === 'sending'"
          @click="handleResend(inv.id)"
        >
          <span v-if="resendStates[inv.id] === 'sending'">Sending…</span>
          <span v-else-if="resendStates[inv.id] === 'sent'" class="resend-sent">Sent!</span>
          <span v-else-if="resendStates[inv.id] === 'error'" class="resend-error">Failed</span>
          <span v-else>Resend</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invite-form { display: flex; flex-direction: column; gap: 0.75rem; }
.form-row { display: flex; gap: 0.5rem; }
.email-input { flex: 1; min-width: 0; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; color: #f0f0f0; font-size: 0.9rem; padding: 0.55rem 0.75rem; outline: none; transition: border-color 0.15s; }
.email-input:focus { border-color: #555; }
.email-input:disabled { opacity: 0.5; }
.invite-btn { padding: 0.55rem 1rem; background: #fff; border: none; border-radius: 6px; color: #0a0a0a; font-size: 0.9rem; font-weight: 600; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; }
.invite-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.invite-btn:not(:disabled):hover { opacity: 0.88; }
.feedback { font-size: 0.85rem; padding: 0.5rem 0.75rem; border-radius: 6px; }
.feedback.success { color: #86efac; background: rgba(134,239,172,0.08); border: 1px solid rgba(134,239,172,0.15); }
.feedback.info { color: #93c5fd; background: rgba(147,197,253,0.08); border: 1px solid rgba(147,197,253,0.15); }
.feedback.error { color: #f87171; background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.15); }
.pending-list { display: flex; flex-direction: column; gap: 0.25rem; border-top: 1px solid #1e1e1e; padding-top: 0.75rem; }
.pending-label { font-size: 0.75rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
.pending-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0; }
.pending-email { flex: 1; font-size: 0.875rem; color: #ccc; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pending-date { font-size: 0.8rem; color: #555; flex-shrink: 0; }
.resend-btn { flex-shrink: 0; padding: 0.25rem 0.6rem; background: transparent; border: 1px solid #2a2a2a; border-radius: 5px; color: #888; font-size: 0.8rem; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
.resend-btn:not(:disabled):hover { border-color: #444; color: #ccc; }
.resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.resend-sent { color: #86efac; }
.resend-error { color: #f87171; }
</style>
