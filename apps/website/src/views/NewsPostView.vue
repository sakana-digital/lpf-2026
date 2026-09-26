<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { findNewsPost } from '@/data/newsLinks'
import { localePath, pagePath } from '@/data/pages'
import type { NewsPostSlug } from '@/data/pages'
import { formatNewsDate, newsDateTime } from '@/lib/newsDate'

const props = defineProps<{
  slug: NewsPostSlug
}>()

const { t, locale } = useI18n()

const post = computed(() => findNewsPost(props.slug))
const formattedDate = computed(() => post.value && formatNewsDate(post.value.date, locale.value))
const newsPath = computed(() => localePath(pagePath('news'), locale.value))
</script>

<template>
  <main class="news-post">
    <article class="article">
      <time v-if="post" class="date" :datetime="newsDateTime(post.date)">{{ formattedDate }}</time>
      <h2 class="title">{{ t(`news.posts.${props.slug}.title`) }}</h2>
      <p class="body">{{ t(`news.posts.${props.slug}.body`) }}</p>
    </article>
    <RouterLink class="back" :to="newsPath">{{ t('news.backToList') }}</RouterLink>
  </main>
</template>

<style scoped>
.news-post {
  align-content: start;

  .article {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px;

    .date {
      color: var(--color-text-mute);
      font-size: 14px;
    }

    .title {
      margin: 0;
      color: var(--color-heading);
      font-size: clamp(1.25rem, 3vw, 1.75rem);
      line-height: 1.4;
    }

    .body {
      margin: 0;
      color: var(--color-text);
      font-size: 16px;
      line-height: 1.8;
      white-space: pre-line;
    }
  }

  .back {
    justify-self: center;
    margin: 16px 0 48px;
    padding: 12px 24px;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    color: var(--color-heading);
    font-size: 14px;
    transition: border-color 0.15s;

    &:hover {
      border-color: var(--color-border-hover);
    }
  }
}
</style>
