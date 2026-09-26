import type { MemberView } from '~/types/picks'

const MAX_OPTIONS = 6

export interface MentionOption {
  id: string // user id, or LEAGUE_MENTION
  name: string
  avatarUrl: string | null
  hint?: string
}

// @-mention autocomplete for the chat composer. Tracks the partial "@query" at
// the caret, offers matching members, and remembers what was picked so the
// plain text can be turned back into @[Name](uuid) tokens on send.
export function useMentionComposer(
  input: Ref<string>,
  textarea: Ref<HTMLTextAreaElement | null | undefined>,
  members: MaybeRefOrGetter<MemberView[]>,
  selfId: MaybeRefOrGetter<string | null>,
  canMentionLeague: MaybeRefOrGetter<boolean>,
) {
  const picked = ref(new Map<string, string>())
  const query = ref<{ start: number, query: string } | null>(null)
  const active = ref(0)
  // Start offset of a mention just picked: "@Sam " must not reopen the menu for "Sam Jones".
  let completedAt = -1

  const options = computed<MentionOption[]>(() => {
    const q = query.value?.query.toLowerCase()
    if (q === undefined) return []
    const list: MentionOption[] = toValue(members)
      .filter((m) => m.userId !== toValue(selfId) && m.displayName.toLowerCase().startsWith(q))
      .map((m) => ({ id: m.userId, name: m.displayName, avatarUrl: m.avatarUrl }))
    if (toValue(canMentionLeague) && LEAGUE_MENTION.startsWith(q)) {
      list.push({ id: LEAGUE_MENTION, name: LEAGUE_MENTION, avatarUrl: null, hint: 'Notify everyone' })
    }
    return list.slice(0, MAX_OPTIONS)
  })
  const open = computed(() => options.value.length > 0)

  // Called on input, click, and caret-moving keys.
  function sync() {
    const el = textarea.value
    if (!el || el.selectionStart !== el.selectionEnd) {
      query.value = null
      return
    }
    let next = mentionQuery(input.value.slice(0, el.selectionStart))
    if (next && next.start === completedAt) next = null
    else completedAt = -1
    if (next?.start !== query.value?.start || next?.query !== query.value?.query) active.value = 0
    query.value = next
  }

  function pick(option: MentionOption) {
    const el = textarea.value
    const q = query.value
    if (!el || !q) return
    const caret = el.selectionStart
    const insert = `@${option.name} `
    input.value = input.value.slice(0, q.start) + insert + input.value.slice(caret)
    if (option.id !== LEAGUE_MENTION) picked.value.set(option.name, option.id)
    query.value = null
    completedAt = q.start
    const pos = q.start + insert.length
    nextTick(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  // Returns true when the menu consumed the key.
  function onKeydown(e: KeyboardEvent) {
    if (!open.value) return false
    const n = options.value.length
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      active.value = (active.value + (e.key === 'ArrowDown' ? 1 : n - 1)) % n
    } else if ((e.key === 'Enter' && !e.shiftKey && !e.isComposing) || e.key === 'Tab') {
      pick(options.value[active.value]!)
    } else if (e.key === 'Escape') {
      query.value = null
    } else {
      return false
    }
    e.preventDefault()
    return true
  }

  const toStored = (text: string) => mentionsToStored(text, picked.value)

  // Load a stored body for editing.
  function load(body: string, nameFor: (userId: string) => string | undefined) {
    const { text, picked: map } = mentionsToDisplay(body, nameFor)
    picked.value = map
    input.value = text
  }

  function reset() {
    picked.value = new Map()
    query.value = null
    completedAt = -1
  }

  return { options, open, active, sync, pick, onKeydown, toStored, load, reset, close: () => (query.value = null) }
}
