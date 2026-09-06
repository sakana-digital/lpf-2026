import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { localizedPath, SITE_ORIGIN } from '@/config/pages'

// Production always points at SITE_ORIGIN, matching what the middleware injected,
// so a deploy never self-references its own <hash>.happo-sai.pages.dev.
function origin(): string {
  return import.meta.env.PROD ? SITE_ORIGIN : window.location.origin
}

/** Rewrites canonical and hreflang on every SPA navigation. */
export function useCanonicalLinks() {
  const route = useRoute()

  watchEffect(() => {
    document.querySelectorAll('link[rel="canonical"], link[hreflang]').forEach((el) => el.remove())

    const { jaPath, enPath } = localizedPath(route.path)
    const base = origin()

    const canonical = document.createElement('link')
    canonical.rel = 'canonical'
    canonical.href = `${base}${route.path}`
    document.head.appendChild(canonical)

    for (const { hreflang, href } of [
      { hreflang: 'ja', href: `${base}${jaPath}` },
      { hreflang: 'en', href: `${base}${enPath}` },
      { hreflang: 'x-default', href: `${base}${jaPath}` },
    ]) {
      const link = document.createElement('link')
      link.rel = 'alternate'
      link.setAttribute('hreflang', hreflang)
      link.href = href
      document.head.appendChild(link)
    }
  })
}
