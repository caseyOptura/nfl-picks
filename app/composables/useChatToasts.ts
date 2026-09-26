import { toast } from 'vue-sonner'
import ChatToast from '~/components/ChatToast.vue'
import type { ChatToastProps } from '~/types/chat'

const MAX_TOASTS = 5

// Oldest first. vue-sonner's visibleToasts only hides extras (they reappear as
// others close); we want the oldest to roll off, so we dismiss it ourselves.
const active: string[] = []
// Repeat counts for grouped toasts, keyed by toast id.
const repeats = new Map<string, number>()
// Grouped toasts that included a mention keep the mention styling until closed.
const mentioned = new Set<string>()

function forget(id: string | number) {
  const key = String(id)
  const i = active.indexOf(key)
  if (i >= 0) active.splice(i, 1)
  repeats.delete(key)
  mentioned.delete(key)
}

export function useChatToasts() {
  // Showing an id that's already open updates it in place and restarts its timer.
  // `group` counts repeats (e.g. "Sam (3)"); otherwise the new props replace the old.
  function show(id: string, props: ChatToastProps, opts: { group?: boolean } = {}) {
    const open = active.includes(id)
    if (!open) forget(id) // drop anything left over from an earlier toast with this id
    const count = open && opts.group ? (repeats.get(id) ?? 1) + 1 : 1
    repeats.set(id, count)
    if (props.kind === 'mention') mentioned.add(id)
    const kind = mentioned.has(id) ? 'mention' : props.kind

    if (open) {
      active.splice(active.indexOf(id), 1)
    } else {
      while (active.length >= MAX_TOASTS) {
        const oldest = active.shift()!
        forget(oldest)
        toast.dismiss(oldest)
      }
    }
    active.push(id)

    toast.custom(markRaw(ChatToast), {
      id,
      componentProps: { ...props, kind, count: opts.group ? count : props.count },
      onDismiss: (t) => forget(t.id),
      onAutoClose: (t) => forget(t.id),
    })
  }

  const isOpen = (id: string) => active.includes(id)

  function dismissAll() {
    for (const id of active.splice(0)) toast.dismiss(id)
    repeats.clear()
    mentioned.clear()
  }

  return { show, isOpen, dismissAll }
}
