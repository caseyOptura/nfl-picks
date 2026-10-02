import { fetchSchedule } from '../utils/espn'

/**
 * Both selectable seasons in one payload, cached in Cloudflare KV (the
 * `espn-cache` mount in `nuxt.config.ts`) so the whole site shares one copy.
 * A cache miss downloads ~7 MB from ESPN, which is what pushed the worker into
 * its resource limits when every cold isolate paid for it.
 *
 * Two minutes keeps live scores reasonably fresh while staying under the KV
 * free tier's 1,000 writes a day (at most 720 here). Stale-while-revalidate is
 * on, so an expired entry is served immediately and refreshed in the background.
 */
export default defineCachedEventHandler(async () => fetchSchedule(), {
  name: 'espn-schedule',
  base: 'espn-cache',
  maxAge: 120,
  getKey: () => 'all',
})
