<script setup lang="ts">
import NewsInstagramLink from '@/components/news/NewsInstagramLink.vue'
import NewsLinksGrid from '@/components/news/NewsLinksGrid.vue'
</script>

<template>
  <main class="news">
    <NewsInstagramLink />
    <NewsLinksGrid />
  </main>
</template>

<style scoped>
.news {
  min-height: 100svh;
}
</style>
