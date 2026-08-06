<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TabBar from '@/components/common/TabBar.vue'
import { localePath } from '@shared/pages'

const { t, locale } = useI18n()

const tabs = computed(() => [
  { to: localePath('/explore/events/', locale.value), label: t('explore.tabs.events') },
  { to: localePath('/explore/schedule/', locale.value), label: t('explore.tabs.schedule') },
  { to: localePath('/explore/map/', locale.value), label: t('explore.tabs.map') },
])
</script>

<template>
  <Teleport to="#page-header-tabs">
    <TabBar :tabs="tabs" :aria-label="t('sitemap.explore')" />
  </Teleport>
</template>
