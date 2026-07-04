<script setup lang="ts">
import ExploreTabBar from '../components/ExploreTabBar.vue'
</script>

<template>
  <main class="explore">
    <ExploreTabBar />
    <div class="content">
      <RouterView />
    </div>
  </main>
</template>

<style scoped>
.explore {
  min-height: calc(100svh - var(--footer-height));
}

.content {
  padding-top: var(--page-title-height);
}
</style>
