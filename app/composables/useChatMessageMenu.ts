import type { ChatMenuMode, ChatMessageAction, ChatMessageView } from '~/types/chat'

// State for the single message menu the chat list shows: which message it's
// open for, where, and which actions that message allows for this user.
export function useChatMessageMenu(messages: () => ChatMessageView[]) {
  const menu = ref<{ messageId: number, anchor: DOMRect, mode: ChatMenuMode } | null>(null)
  const message = computed(() => messages().find((m) => m.id === menu.value?.messageId))

  const actions = computed<ChatMessageAction[]>(() => {
    const m = message.value
    if (!m || menu.value?.mode === 'react') return []
    const list: ChatMessageAction[] = []
    if (m.kind === 'user') list.push('reply')
    if (m.canEdit) list.push('edit')
    list.push('copy')
    if (m.canDelete) list.push('delete')
    return list
  })

  const selected = computed(() => message.value?.reactions.filter((r) => r.mine).map((r) => r.emoji) ?? [])

  const open = (messageId: number, anchor: DOMRect, mode: ChatMenuMode) => (menu.value = { messageId, anchor, mode })
  const close = () => (menu.value = null)

  return { menu, message, actions, selected, open, close }
}
