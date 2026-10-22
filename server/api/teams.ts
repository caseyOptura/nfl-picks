import { espnFetch, espnUrls } from '../utils/espn'

export default defineEventHandler(event => swrCache(event, {
  storage: 'espn-memory',
  key: 'teams',
  maxAge: 60 * 60,
  fetch: () => espnFetch(espnUrls.teams()),
}))
