<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InstagramIcon from '@/components/common/icons/instagram.vue'
import { instagramUrl } from '@/config/social'

const { t } = useI18n()
</script>

<template>
  <Teleport to="#page-header-tabs">
    <a class="instagram-link" :href="instagramUrl" target="_blank" rel="noopener noreferrer">
      <InstagramIcon />
      {{ t('news.instagramLink') }}
    </a>
  </Teleport>
</template>

<style scoped>
.instagram-link {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.375rem;
  color: var(--color-text-mute);
  font-size: 1rem;
  text-decoration: none;
  transition: color 0.15s;

  &:hover {
    color: var(--color-heading);
  }
}
</style>
