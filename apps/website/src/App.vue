<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Header from '@/components/layout/Header.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SearchModal from '@/components/search/SearchModal.vue'
import { useCanonicalLinks } from '@/composables/useCanonicalLinks'
import { isRootPath } from '@/config/pages'

const route = useRoute()
const isRoot = computed(() => isRootPath(route.path))
const pageTitleKey = computed(() => route.meta.pageTitle)
const hasPageHeader = computed(() => !isRoot.value && !!pageTitleKey.value)

useCanonicalLinks()

watchEffect(() => {
  document.documentElement.toggleAttribute('data-page-header', hasPageHeader.value)
})
</script>

<template>
  <Header />
  <PageHeader v-if="!isRoot && pageTitleKey" :title-key="pageTitleKey" />
  <RouterView />
  <SearchModal />
</template>
