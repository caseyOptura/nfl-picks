// Mentions are stored as @[Display Name](user-uuid) but typed and edited as
// plain @Display Name. The composer keeps a name → id map of mentions picked
// from the autocomplete and converts between the two forms.

const TOKEN_RE = /@\[([^\]]{1,80})\]\(([0-9a-f-]{36})\)/gi

export const LEAGUE_MENTION = 'league'

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Stored body → editable text, plus the mentions it contains.
export function mentionsToDisplay(body: string, nameFor: (userId: string) => string | undefined) {
  const picked = new Map<string, string>()
  const text = body.replace(TOKEN_RE, (_, stored: string, userId: string) => {
    const name = nameFor(userId) ?? stored
    picked.set(name, userId)
    return `@${name}`
  })
  return { text, picked }
}

// Editable text → stored body. Longest names first so "@Sam Jones" wins over "@Sam".
// A picked name only converts when it isn't followed by more of a word.
export function mentionsToStored(text: string, picked: Map<string, string>) {
  let out = text
  const names = [...picked.keys()].sort((a, b) => b.length - a.length)
  for (const name of names) {
    const re = new RegExp(`(^|[^\\w\\]])@${escapeRe(name)}(?![\\w\\[])`, 'g')
    out = out.replace(re, (_, pre: string) => `${pre}@[${name.replace(/[[\]]/g, '')}](${picked.get(name)})`)
  }
  return out
}

// The partial "@query" ending at the caret, if the user is typing a mention.
export function mentionQuery(beforeCaret: string): { start: number, query: string } | null {
  const m = /(^|\s)@([^@\n]{0,30})$/.exec(beforeCaret)
  if (!m) return null
  return { start: m.index + m[1]!.length, query: m[2]! }
}
