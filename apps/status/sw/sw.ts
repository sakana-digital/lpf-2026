/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  PrecacheFallbackPlugin,
  precacheAndRoute,
} from 'workbox-precaching'
import { createPartialResponse } from 'workbox-range-requests'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'
import { MEDIA_CACHE } from '../src/lib/signageOffline'

declare const self: ServiceWorkerGlobalScope

// A signage left running should pick up a deploy without anyone touching it.
void self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// The viewer token has to reach the server so it can swap it for a cookie.
registerRoute(
  ({ request, url }) => request.mode === 'navigate' && url.searchParams.has('t'),
  new NetworkOnly({ plugins: [new PrecacheFallbackPlugin({ fallbackURL: 'index.html' })] }),
)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

registerRoute(
  ({ url }) => /^\/api\/signage\/(video|audio)\//.test(url.pathname),
  async ({ request }) => {
    const cached = await caches.match(request.url, { cacheName: MEDIA_CACHE })
    if (!cached) return fetch(request)
    return request.headers.has('range') ? createPartialResponse(request, cached) : cached
  },
)

registerRoute(
  ({ url }) => url.origin === 'https://use.typekit.net',
  new StaleWhileRevalidate({
    cacheName: 'signage-fonts',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
)
