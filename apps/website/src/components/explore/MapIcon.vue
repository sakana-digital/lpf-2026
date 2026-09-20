<script setup lang="ts">
import { ICON_SIZE, mapIcons } from '@/lib/mapIcons'
import type { MapIconName } from '@/lib/mapIcons'

defineProps<{ name: MapIconName }>()
</script>

<template>
  <svg :viewBox="`0 ${-ICON_SIZE} ${ICON_SIZE} ${ICON_SIZE}`" aria-hidden="true">
    <path :d="mapIcons[name]" />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
