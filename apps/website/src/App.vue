<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Header from '@/components/common/layout/Header.vue'
import PageHeader from '@/components/common/layout/PageHeader.vue'
import SearchModal from '@/components/common/SearchModal.vue'
import { useIsRoot } from '@/composables/useIsRoot'
import { useCanonicalLinks } from '@/composables/useCanonicalLinks'

const route = useRoute()
const isRoot = useIsRoot()
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
