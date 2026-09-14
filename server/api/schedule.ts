import { fetchSchedule } from '../utils/espn'

/**
 * Both selectable seasons in one payload. Cached briefly so a page full of
 * live scores does not fan out to ESPN on every request — the previous
 * uncached version re-fetched ~570 events per page load, which is what pushed
 * the worker into its resource limits.
 */
export default defineCachedEventHandler(async () => fetchSchedule(), {
  name: 'espn-schedule',
  maxAge: 60,
  getKey: () => 'all',
})
