<script setup lang="ts">
import ExploreTabBar from '../components/ExploreTabBar.vue'
</script>

<template>
  <main class="explore">
    <div class="content">
      <ExploreTabBar />
      <RouterView />
    </div>
  </main>
</template>

<style scoped>
.explore {
  min-height: calc(100svh - var(--footer-height));
}

.content {
  padding-top: calc(var(--page-title-height) + var(--tabbar-height));
}
</style>
