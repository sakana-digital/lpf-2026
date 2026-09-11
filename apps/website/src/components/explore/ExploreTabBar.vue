<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TabBar from '@/components/layout/TabBar.vue'
import { EXPLORE_TABS } from '@/lib/exploreTab'
import { localePath, pagePath } from '@/data/pages'

const route = useRoute()
const { t, locale } = useI18n()

// The tabs share the query, so the selection and grouping survive a switch
const tabs = computed(() =>
  EXPLORE_TABS.map((tab) => ({
    id: tab,
    to: { path: localePath(pagePath(tab), locale.value), query: route.query },
    label: t(`explore.tabs.${tab}`),
  })),
)
</script>

<template>
  <Teleport to="#page-header-actions">
    <TabBar :tabs="tabs" :aria-label="t('sitemap.explore')" />
  </Teleport>
</template>
