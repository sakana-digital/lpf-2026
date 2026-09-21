<script setup lang="ts">
import ExploreTabBar from '@/components/explore/ExploreTabBar.vue'
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
  /* Room between the tab strip and each tab's controls */
  --tab-gap: 12px;

  min-height: 100svh;

  .content {
    grid-column: 1 / -1;
    min-width: 0;
  }
}
</style>
