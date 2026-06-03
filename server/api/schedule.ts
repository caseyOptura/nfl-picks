const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'

export default defineEventHandler(async () => {
  const [season2025, season2026] = await Promise.all([
    $fetch<{ events?: unknown[] }>(`${ESPN_SCOREBOARD}?dates=20250901-20260201&limit=500`),
    $fetch<{ events?: unknown[] }>(`${ESPN_SCOREBOARD}?dates=20260901-20270201&limit=500`),
  ])

  return {
    events: [
      ...(season2025.events ?? []),
      ...(season2026.events ?? []),
    ],
  }
})
