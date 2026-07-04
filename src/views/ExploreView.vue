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
  min-height: 100svh;
}
</style>
