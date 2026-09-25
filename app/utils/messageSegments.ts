import { tokenize } from 'linkifyjs'

export type MessageSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'mention'; text: string; userId: string | null }

// @[Display Name](user-uuid), as written by the composer's mention picker.
const MENTION_RE = /@\[([^\]]{1,80})\]\(([0-9a-f-]{36})\)|(^|\s)(@league)\b/gi

function linkSegments(text: string): MessageSegment[] {
  return tokenize(text).map((t) => {
    if (t.isLink && t.t === 'url') {
      const href = t.toHref('https')
      if (/^https?:\/\//i.test(href)) return { type: 'link', text: t.v, href }
    }
    return { type: 'text', text: t.v }
  })
}

// Splits a message body into renderable pieces. Everything is rendered as text
// nodes by the component — this never produces HTML.
export function messageSegments(body: string, nameFor: (userId: string) => string | undefined): MessageSegment[] {
  const out: MessageSegment[] = []
  let last = 0
  for (const m of body.matchAll(MENTION_RE)) {
    const start = m.index! + (m[3]?.length ?? 0)
    if (start > last) out.push(...linkSegments(body.slice(last, start)))
    if (m[4]) {
      out.push({ type: 'mention', text: '@league', userId: null })
    } else {
      const userId = m[2]!
      out.push({ type: 'mention', text: `@${nameFor(userId) ?? m[1]}`, userId })
    }
    last = m.index! + m[0].length
  }
  if (last < body.length) out.push(...linkSegments(body.slice(last)))
  return out
}

// Plain-text preview used by toasts and reply quotes.
export function messageSnippet(body: string, max = 80): string {
  const plain = body.replace(/@\[([^\]]{1,80})\]\([0-9a-f-]{36}\)/gi, '@$1').replace(/\s+/g, ' ').trim()
  return plain.length > max ? plain.slice(0, max - 1) + '…' : plain
}
