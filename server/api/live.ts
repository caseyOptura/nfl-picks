import { cachedLive } from '../utils/espn'

/** Clock, score and ball state for this week's games that have kicked off. */
export default defineEventHandler(event => cachedLive(event))
