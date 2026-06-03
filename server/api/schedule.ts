export default defineEventHandler(() =>
  $fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20250901-20260201&limit=500')
)
