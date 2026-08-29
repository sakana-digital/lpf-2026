<script setup lang="ts">
import NewsInstagramLink from '@/components/news/NewsInstagramLink.vue'
import NewsLinksGrid from '@/components/news/NewsLinksGrid.vue'
import { newsLinks } from '@/config/newsLinks'
</script>

<template>
  <main class="news">
    <NewsInstagramLink />
    <NewsLinksGrid :items="newsLinks" />
  </main>
</template>

<style scoped>
.news {
  min-height: 100svh;

  .news-links {
    padding: 16px;
  }
}
</style>
