import { espnFetch, espnUrls } from '../../../utils/espn'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing team id' })
  return swrCache(event, {
    storage: 'espn-memory',
    key: `roster:${id}`,
    maxAge: 60 * 60,
    fetch: () => espnFetch(espnUrls.teamRoster(id)),
  })
})
