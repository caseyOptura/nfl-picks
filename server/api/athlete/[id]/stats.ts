export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  try {
    return await $fetch(
      `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/athletes/${id}/statistics`
    )
  } catch {
    return { splits: { categories: [] } }
  }
})
