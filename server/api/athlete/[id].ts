import { espnFetch, espnUrls } from '../../utils/espn'

export default defineCachedEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing athlete id' })
  return espnFetch(espnUrls.athlete(id))
}, {
  name: 'espn-athlete',
  maxAge: 60 * 60,
  getKey: event => getRouterParam(event, 'id') ?? 'unknown',
})
