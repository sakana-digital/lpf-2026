<script setup lang="ts">
defineProps<{ src: string }>()
</script>

<template>
  <img class="org-backdrop" :src="src" alt="" aria-hidden="true" decoding="async" />
</template>

<style scoped>
/* Fills a positioned box from behind: the host isolates its stacking so -1 stays inside it */
.org-backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  scale: 1.15;
  filter: blur(var(--backdrop-blur, 12px)) saturate(1.4);
  opacity: 0.5;
  pointer-events: none;
  transition: filter 0.3s;
}
</style>
