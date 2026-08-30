interface Env {
  STATUS: { fetch: (request: Request) => Promise<Response> }
}

interface Context {
  request: Request
  env: Env
  waitUntil(promise: Promise<unknown>): void
}

interface EdgeCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

/** caches.default is missing from the DOM CacheStorage type. */
function edgeCache(): EdgeCache | undefined {
  return (globalThis as { caches?: { default?: EdgeCache } }).caches?.default
}

function isPublic(response: Response): boolean {
  return response.ok && (response.headers.get('Cache-Control') ?? '').includes('public')
}

export async function onRequestGet(context: Context): Promise<Response> {
  const { request, env } = context
  const cache = edgeCache()
  if (!cache) return env.STATUS.fetch(request)

  // Key on the URL alone so cookies never fragment the cache
  const key = new Request(request.url)
  const cached = await cache.match(key)
  if (cached) return cached

  const response = await env.STATUS.fetch(request)
  if (!isPublic(response)) return response
  context.waitUntil(cache.put(key, response.clone()))
  return response
}
