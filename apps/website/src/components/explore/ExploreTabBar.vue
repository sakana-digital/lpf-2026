<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TabBar from '@/components/common/TabBar.vue'

const { t, locale } = useI18n()

const tabs = computed(() => {
  const prefix = locale.value === 'en' ? '/en' : ''
  return [
    { to: `${prefix}/explore/events/`, label: t('explore.tabs.events') },
    { to: `${prefix}/explore/schedule/`, label: t('explore.tabs.schedule') },
    { to: `${prefix}/explore/map/`, label: t('explore.tabs.map') },
  ]
})
</script>

<template>
  <Teleport to="#page-header-tabs">
    <TabBar :tabs="tabs" :aria-label="t('sitemap.explore')" />
  </Teleport>
</template>
