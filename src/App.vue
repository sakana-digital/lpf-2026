<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import PageTitle from './components/PageTitle.vue'
import SearchModal from './components/SearchModal.vue'
import { useIsRoot } from './composables/useIsRoot'

const { t } = useI18n()
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
  <PageTitle v-if="!isRoot && pageTitleKey" :title="t(pageTitleKey)" />
  <RouterView />
  <Footer />
  <SearchModal />
</template>
