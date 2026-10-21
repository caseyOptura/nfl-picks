import { cachedSchedule } from '../utils/espn'

/** Both selectable seasons in one payload, from the shared KV cache. */
export default defineEventHandler(event => cachedSchedule(event))
