import { espnFetch, espnUrls } from '../../../utils/espn'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing team id' })
  return swrCache(event, {
    storage: 'espn-memory',
    key: `team-schedule:${id}`,
    maxAge: 60,
    fetch: () => espnFetch(espnUrls.teamSchedule(id)),
  })
})
