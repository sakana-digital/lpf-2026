<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TabBar from '@/components/layout/TabBar.vue'
import { EXPLORE_TABS } from '@/lib/exploreTab'
import { localePath, pagePath } from '@/data/pages'

const { t, locale } = useI18n()

const tabs = computed(() =>
  EXPLORE_TABS.map((tab) => ({
    to: localePath(pagePath(tab), locale.value),
    label: t(`explore.tabs.${tab}`),
  })),
)
</script>

<template>
  <Teleport to="#page-header-actions">
    <TabBar :tabs="tabs" :aria-label="t('sitemap.explore')" />
  </Teleport>
</template>
