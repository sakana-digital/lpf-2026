<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { localePath, newsPostPageId, pagePath } from '@/data/pages'
import type { NewsPostSlug } from '@/data/pages'
import { formatNewsDate } from '@/lib/newsDate'

const props = defineProps<{
  slug: NewsPostSlug
  date: string
}>()

const { t, locale } = useI18n()

const to = computed(() => localePath(pagePath(newsPostPageId(props.slug)), locale.value))
const formattedDate = computed(() => formatNewsDate(props.date, locale.value))
</script>

<template>
  <RouterLink class="news-post-card" :to="to">
    <time class="date" :datetime="props.date">{{ formattedDate }}</time>
    <h3 class="title">{{ t(`news.posts.${props.slug}.title`) }}</h3>
    <p class="body">{{ t(`news.posts.${props.slug}.body`) }}</p>
  </RouterLink>
</template>

<style scoped>
.news-post-card {
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

  .date {
    color: var(--color-text-mute);
    font-size: 12px;
  }

  .title {
    margin: 0;
    color: var(--color-heading);
    font-size: 16px;
    line-height: 1.5;
  }

  .body {
    display: -webkit-box;
    overflow: hidden;
    margin: 0;
    color: var(--color-text);
    font-size: 14px;
    line-height: 1.6;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}
</style>
