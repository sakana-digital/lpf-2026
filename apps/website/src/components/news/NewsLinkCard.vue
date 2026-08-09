<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  url: string
  titleKey: string
  source: 'school'
}>()

const { t } = useI18n()

const domain = computed(() => new URL(props.url).hostname)
</script>

<template>
  <a class="news-link-card" :href="props.url" target="_blank" rel="noopener noreferrer">
    <p class="title">{{ t(props.titleKey) }}</p>
    <p class="source">{{ t(`siteLinks.${props.source}`) }} · {{ domain }}</p>
  </a>
</template>

<style scoped>
.news-link-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  text-decoration: none;
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--color-border-hover);
  }

  .title {
    margin: 0;
    color: var(--color-heading);
    font-size: 16px;
    font-weight: 600;
    line-height: 1.5;
  }

  .source {
    margin: 0;
    color: var(--color-text-mute);
    font-size: 12px;
  }
}
</style>
