export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  return $fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${id}/roster`)
})
