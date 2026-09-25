/** Shared with the service worker, which answers media requests from it. */
export const MEDIA_CACHE = 'signage-media'

/** Reports a download at most once per whole percent. */
export type MediaProgress = (path: string, loaded: number, total: number) => void

const downloads = new Map<string, Promise<boolean>>()
const uncacheable = new Set<string>()

function withProgress(response: Response, path: string, onProgress: MediaProgress): Response {
  const total = Number(response.headers.get('Content-Length'))
  if (!response.body || !(total > 0)) return response
  let loaded = 0
  let percent = -1
  const body = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.byteLength
        const next = Math.floor((loaded * 100) / total)
        if (next !== percent) {
          percent = next
          onProgress(path, loaded, total)
        }
        controller.enqueue(chunk)
      },
    }),
  )
  return new Response(body, response)
}

function ensureCached(
  cache: Cache,
  path: string,
  url: string,
  onProgress: MediaProgress,
): Promise<boolean> {
  const running = downloads.get(url)
  if (running) return running
  const download = (async () => {
    if (uncacheable.has(url) || (await cache.match(url))) return true
    const response = await fetch(url)
    if (response.status !== 200) return false
    try {
      await cache.put(url, withProgress(response, path, onProgress))
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'QuotaExceededError')) throw error
      // Too big to keep, so it streams as it would without Cache Storage.
      uncacheable.add(url)
    }
    return true
  })()
    .catch(() => false)
    .finally(() => downloads.delete(url))
  downloads.set(url, download)
  return download
}

/**
 * Keeps whole copies of exactly the given media and resolves to the ones that
 * can play. The player asks for byte ranges, which Cache Storage cannot hold, so
 * the files are fetched in full here and the service worker slices them. A file
 * is held back until its copy is whole; streaming it meanwhile downloads it twice.
 */
export async function syncMediaCache(
  paths: string[],
  onProgress: MediaProgress,
): Promise<string[]> {
  // Cache Storage only exists in secure contexts, so a LAN http:// preview
  // streams everything. Caching is best-effort: the display must keep going.
  if (!('caches' in globalThis)) return paths
  const cache = await caches.open(MEDIA_CACHE).catch(() => null)
  if (!cache) return paths
  const urls = paths.map((path) => new URL(path, location.href).href)
  const stale = (await cache.keys().catch(() => [])).filter((req) => !urls.includes(req.url))
  await Promise.all(stale.map((request) => cache.delete(request).catch(() => false)))
  const ready = await Promise.all(
    urls.map((url, i) => ensureCached(cache, paths[i]!, url, onProgress)),
  )
  return paths.filter((_, i) => ready[i])
}
