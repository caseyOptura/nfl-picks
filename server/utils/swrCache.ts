import type { H3Event } from 'h3'

/**
 * Stale-while-revalidate over a Nitro storage mount (`espn-cache` is KV,
 * `espn-memory` is per-isolate memory; both are set up in `nuxt.config.ts`).
 *
 * Fresh entries are returned as-is. Stale ones are returned immediately while
 * a refresh runs after the response (`waitUntil`). With nothing cached yet, the
 * request fetches itself. A failed storage read or write degrades to fetching
 * uncached rather than failing the request.
 *
 * Deliberately not Nitro's `defineCachedFunction` / `defineCachedEventHandler`:
 * those share one in-flight fetch between concurrent requests, and on Workers a
 * request cancelled mid-fetch leaves the shared promise unsettled, so every
 * later request for that key in the isolate waits on it forever (or fails with
 * error 1101). Here each request only ever awaits work it started; the cost is
 * that simultaneous misses each fetch upstream.
 */
export async function swrCache<T>(
  event: H3Event,
  opts: { storage: string; key: string; maxAge: number; fetch: () => Promise<T> },
): Promise<T> {
  const storage = useStorage(opts.storage)
  const tag = `[${opts.storage}] ${opts.key}`

  const entry = await storage.getItem<{ mtime: number; value: T }>(opts.key)
    .catch((error) => {
      console.error(`${tag}: read failed`, error)
      return null
    })

  if (entry && Date.now() - entry.mtime < opts.maxAge * 1000) return entry.value

  const refresh = opts.fetch().then(async (value) => {
    await storage.setItem(opts.key, { mtime: Date.now(), value })
      .catch(error => console.error(`${tag}: write failed`, error))
    return value
  })

  if (!entry) return refresh

  event.waitUntil(refresh.catch(error => console.error(`${tag}: refresh failed`, error)))
  return entry.value
}
