export function formatGameTime(utcIso: string): string {
  const d = new Date(utcIso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatGameDate(utcIso: string): string {
  const d = new Date(utcIso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Chat day separators: Today / Yesterday / Thu, Sep 25.
export function formatDayLabel(iso: string): string {
  const d = new Date(iso).toDateString()
  if (d === new Date().toDateString()) return 'Today'
  if (d === new Date(Date.now() - 86_400_000).toDateString()) return 'Yesterday'
  return formatGameDate(iso)
}
