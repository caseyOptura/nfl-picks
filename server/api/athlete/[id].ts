export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  return $fetch(`https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/athletes/${id}`)
})
