import { espnFetch, espnUrls } from '../../../utils/espn'

export default defineCachedEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing team id' })
  return espnFetch(espnUrls.teamRoster(id))
}, {
  name: 'espn-team-roster',
  maxAge: 60 * 60,
  getKey: event => getRouterParam(event, 'id') ?? 'unknown',
})
