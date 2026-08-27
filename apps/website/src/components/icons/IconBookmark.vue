<script setup lang="ts">
defineProps<{ filled?: boolean }>()
</script>

<template>
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M4.5 2.5H11.5Q12 2.5 12 3V13L8 10.4 4 13V3Q4 2.5 4.5 2.5Z"
      :fill="filled ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 16px;
  height: 16px;
}
</style>
