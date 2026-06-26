<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const crumbs = computed(() => {
  const segments = route.path.split('/').filter(Boolean)
  return segments.map((segment, index) => ({
    label: segment,
    to: '/' + segments.slice(0, index + 1).join('/'),
  }))
})
</script>

<template>
  <div v-if="crumbs.length" class="breadcrumb" aria-label="breadcrumb">
    <template v-for="crumb in crumbs" :key="crumb.to">
      <svg
        class="separator"
        width="8"
        height="16"
        viewBox="0 0 8 16"
        fill="none"
        aria-hidden="true"
      >
        <line
          x1="6"
          y1="2"
          x2="2"
          y2="14"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <RouterLink :to="crumb.to" class="crumb">{{ crumb.label }}</RouterLink>
    </template>
  </div>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 0.875rem;
  color: #888;
}
</style>
