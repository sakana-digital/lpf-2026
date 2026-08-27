import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { localizedPath, SITE_ORIGIN } from '@/config/pages'

// 本番は必ず SITE_ORIGIN を指す。middleware が入れた値と一致させ、
// デプロイごとの <hash>.happo-sai.pages.dev で自己参照させない。
function origin(): string {
  return import.meta.env.PROD ? SITE_ORIGIN : window.location.origin
}

/** SPA 遷移のたびに canonical と hreflang を貼り直す。 */
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
