<script setup lang="ts">
import { watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Header from './components/Header.vue'

const route = useRoute()

watchEffect(() => {
  document.querySelectorAll('link[hreflang]').forEach((el) => el.remove())

  const path = route.path
  const isEn = path === '/en' || path.startsWith('/en/')
  const jaPath = isEn ? path.slice(3) || '/' : path
  const enPath = '/en' + (jaPath === '/' ? '' : jaPath)
  const origin = window.location.origin

  for (const { hreflang, href } of [
    { hreflang: 'ja', href: `${origin}${jaPath}` },
    { hreflang: 'en', href: `${origin}${enPath}` },
    { hreflang: 'x-default', href: `${origin}${jaPath}` },
  ]) {
    const link = document.createElement('link')
    link.rel = 'alternate'
    link.setAttribute('hreflang', hreflang)
    link.href = href
    document.head.appendChild(link)
  }
})
</script>

<template>
  <Header />
  <RouterView />
</template>
