<script setup lang="ts">
import TextShuffle from './TextShuffle.vue'

defineProps<{
  title: string
}>()
</script>

<template>
  <div class="page-title">
    <h1><TextShuffle :text="title" /></h1>
  </div>
</template>

<style scoped>
.page-title {
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  width: min(1024px, 100%);
  height: var(--page-title-height);
  margin: 0 auto;
  padding: 0 16px;

  h1 {
    overflow: hidden;
    width: 100%;
    font-size: clamp(1.75rem, 4vw, 2.75rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--color-heading);
  }
}
</style>
