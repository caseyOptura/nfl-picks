<script setup lang="ts">
import type { MemberView } from '~/types/picks'
import type { ComposerContext } from '~/types/chat'

const MAX = 2000

const props = defineProps<{
  members: MemberView[]
  canMentionLeague: boolean
  context: ComposerContext | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [body: string]
  cancel: []
  typing: []
  blur: []
}>()

const { userId } = useAuth()
const { textarea, input } = useTextareaAutosize()
const mentions = useMentionComposer(input, textarea, () => props.members, userId, () => props.canMentionLeague)

const remaining = computed(() => MAX - input.value.length)
const canSend = computed(() => !props.disabled && input.value.trim().length > 0 && remaining.value >= 0)

function clear() {
  input.value = ''
  mentions.reset()
}

function submit() {
  if (!canSend.value) return
  emit('send', mentions.toStored(input.value))
  clear()
  textarea.value?.focus()
}

function cancel() {
  if (props.context?.kind === 'edit') clear()
  emit('cancel')
}

function onKeydown(e: KeyboardEvent) {
  if (mentions.onKeydown(e)) return
  if (e.key === 'Escape' && props.context) {
    e.preventDefault()
    cancel()
    return
  }
  // Enter sends; Shift+Enter (and IME composition) inserts a newline.
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}

function onInput() {
  mentions.sync()
  if (input.value.trim()) emit('typing')
}

function onBlur() {
  mentions.close()
  emit('blur')
}

function focus() {
  textarea.value?.focus()
}

defineExpose({
  focus,
  // Put a stored message body in the box for editing.
  edit(body: string, nameFor: (userId: string) => string | undefined) {
    mentions.load(body, nameFor)
    nextTick(() => {
      focus()
      textarea.value?.setSelectionRange(input.value.length, input.value.length)
    })
  },
})
</script>

<template>
  <div class="composer-wrap">
    <div v-if="context" class="context">
      <span class="context-text">
        <strong>{{ context.kind === 'edit' ? 'Editing message' : `Replying to ${context.name}` }}</strong>
        <span v-if="context.kind === 'reply'" class="snippet">{{ context.snippet }}</span>
      </span>
      <button type="button" class="cancel" :aria-label="context.kind === 'edit' ? 'Cancel edit' : 'Cancel reply'" @click="cancel">✕</button>
    </div>

    <form class="composer" @submit.prevent="submit">
      <ChatMentionMenu
        v-if="mentions.open.value"
        :options="mentions.options.value"
        :active="mentions.active.value"
        @pick="mentions.pick"
        @hover="mentions.active.value = $event"
      />
      <textarea
        ref="textarea"
        v-model="input"
        class="input"
        rows="1"
        placeholder="Message the league…"
        aria-label="Message"
        :aria-expanded="mentions.open.value"
        :aria-activedescendant="mentions.open.value ? `mention-opt-${mentions.active.value}` : undefined"
        :maxlength="MAX + 200"
        enterkeyhint="send"
        @keydown="onKeydown"
        @keyup="mentions.sync"
        @click="mentions.sync"
        @input="onInput"
        @blur="onBlur"
      />
      <span v-if="remaining < 200" class="counter" :class="{ over: remaining < 0 }">{{ remaining }}</span>
      <button type="submit" class="send" :disabled="!canSend" :aria-label="context?.kind === 'edit' ? 'Save edit' : 'Send message'">
        <svg v-if="context?.kind === 'edit'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
        </svg>
      </button>
    </form>
  </div>
</template>

<style scoped>
/* Positioned here (not on the form) so the mention menu opens above the reply strip. */
.composer-wrap { position: relative; background: #111; border-top: 1px solid #222; }
.context {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem 0 1rem;
  font-size: 0.78rem;
  color: #999;
}
.context-text { flex: 1; min-width: 0; display: flex; gap: 0.4rem; white-space: nowrap; overflow: hidden; }
.context-text strong { color: #93c5fd; font-weight: 600; flex-shrink: 0; }
.snippet { overflow: hidden; text-overflow: ellipsis; }
.cancel { background: none; border: none; color: #888; font-size: 0.85rem; cursor: pointer; padding: 0.2rem 0.35rem; }
.cancel:hover { color: #fff; }
.composer {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom));
}
.input {
  flex: 1;
  resize: none;
  max-height: 140px;
  background: #0a0a0a;
  color: #f0f0f0;
  border: 1px solid #2a2a2a;
  border-radius: 18px;
  padding: 0.55rem 0.85rem;
  font: inherit;
  font-size: 16px; /* ≥16px stops iOS zooming on focus */
  line-height: 1.35;
}
.input:focus { outline: none; border-color: #444; }
.counter { font-size: 0.72rem; color: #666; align-self: center; }
.counter.over { color: #f87171; }
.send {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  color: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.send:disabled { background: #2a2a2a; color: #666; cursor: default; }
</style>
