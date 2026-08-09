<script setup lang="ts">
const props = defineProps<{
  url: string
}>()
</script>

<template>
  <div class="instagram-embed">
    <blockquote
      class="instagram-media"
      data-instgrm-captioned
      :data-instgrm-permalink="props.url"
      data-instgrm-version="14"
    >
      <a :href="props.url" target="_blank" rel="noopener noreferrer">
        {{ props.url }}
      </a>
    </blockquote>
  </div>
</template>

<style scoped>
.instagram-embed {
  width: 100%;
}

.instagram-embed :deep(.instagram-media) {
  width: calc(100% - 2px) !important;
  min-width: 0 !important;
  max-width: 540px !important;
  margin: 0 auto !important;
}
</style>
