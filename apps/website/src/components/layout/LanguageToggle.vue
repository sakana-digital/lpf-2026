<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { localizedPath } from '@/data/pages'

const route = useRoute()
const { t, locale } = useI18n()

const paths = computed(() => localizedPath(route.path))
const otherPath = computed(() => (locale.value === 'ja' ? paths.value.enPath : paths.value.jaPath))
</script>

<template>
  <RouterLink :to="otherPath" class="language-toggle" :aria-label="t('languageToggle.label')">
    <span class="lang" :class="{ active: locale === 'ja' }">JA</span>
    <span class="separator" aria-hidden="true">/</span>
    <span class="lang" :class="{ active: locale === 'en' }">EN</span>
  </RouterLink>
</template>

<style scoped>
.language-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  margin: -8px;
  color: var(--color-text-mute);
  font-size: 12px;
  text-decoration: none;

  .separator {
    opacity: 0.5;
  }

  .lang {
    transition: color 0.15s;

    &.active {
      color: var(--color-heading);
    }
  }

  &:hover .lang:not(.active) {
    color: var(--color-text);
  }
}
</style>
