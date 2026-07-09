<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { schoolUrl } from '@/config/social'

const { t } = useI18n()
</script>

<template>
  <a class="school-link" :href="schoolUrl" target="_blank" rel="noopener noreferrer">
    {{ t('siteLinks.school') }}
  </a>
</template>

<style scoped>
.school-link {
  color: var(--color-text-mute);
  font-size: 14px;
  text-decoration: none;

  &:hover {
    color: var(--color-heading);
  }
}
</style>
