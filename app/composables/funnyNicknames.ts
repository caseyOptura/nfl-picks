export const FUNNY_NICKNAMES = [
  'Touchdown Tornado', 'Pocket Picasso', 'Hail Mary Harry', 'Blitz Wizard',
  'Gridiron Gremlin', 'Sir Sacks-a-Lot', 'The Audible Avenger', 'Pylon Prophet',
  'Two-Minute Drillmaster', 'Coach Couch Potato'
] as const

export function randomNickname(firstName?: string | null): string {
  const base = FUNNY_NICKNAMES[Math.floor(Math.random() * FUNNY_NICKNAMES.length)]
  return firstName ? `${base} ${firstName}` : base
}
