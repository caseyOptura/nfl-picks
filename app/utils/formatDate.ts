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
