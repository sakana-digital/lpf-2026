<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Header from '@/components/common/layout/Header.vue'
import Footer from '@/components/common/layout/Footer.vue'
import PageHeader from '@/components/common/layout/PageHeader.vue'
import SearchModal from '@/components/common/SearchModal.vue'
import { useIsRoot } from '@/composables/useIsRoot'

const route = useRoute()
const isRoot = useIsRoot()
const pageTitleKey = computed(() => route.meta.pageTitle as string | undefined)

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
  <PageHeader v-if="!isRoot && pageTitleKey" :title-key="pageTitleKey" />
  <RouterView />
  <Footer />
  <SearchModal />
</template>
