import { espnFetch, espnUrls } from '../utils/espn'

export default defineCachedEventHandler(async () => espnFetch(espnUrls.teams()), {
  name: 'espn-teams',
  maxAge: 60 * 60,
  getKey: () => 'all',
})
