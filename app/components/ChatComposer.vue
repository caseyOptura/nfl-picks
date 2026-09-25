<script setup lang="ts">
const MAX = 2000

const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [body: string]
  typing: []
  blur: []
}>()

const { textarea, input } = useTextareaAutosize()

const remaining = computed(() => MAX - input.value.length)
const canSend = computed(() => !props.disabled && input.value.trim().length > 0 && remaining.value >= 0)

function submit() {
  if (!canSend.value) return
  emit('send', input.value)
  input.value = ''
  textarea.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  // Enter sends; Shift+Enter (and IME composition) inserts a newline.
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}

function onInput() {
  if (input.value.trim()) emit('typing')
}

defineExpose({ focus: () => textarea.value?.focus() })
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <textarea
      ref="textarea"
      v-model="input"
      class="input"
      rows="1"
      placeholder="Message the league…"
      aria-label="Message"
      :maxlength="MAX + 200"
      enterkeyhint="send"
      @keydown="onKeydown"
      @input="onInput"
      @blur="emit('blur')"
    />
    <span v-if="remaining < 200" class="counter" :class="{ over: remaining < 0 }">{{ remaining }}</span>
    <button type="submit" class="send" :disabled="!canSend" aria-label="Send message">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" />
      </svg>
    </button>
  </form>
</template>

<style scoped>
.composer {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom));
  background: #111;
  border-top: 1px solid #222;
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
