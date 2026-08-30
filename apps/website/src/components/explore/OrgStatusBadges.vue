<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { hidesCongestion } from '@shared/status'
import type { OrgStatus } from '@shared/status'

defineProps<{ status: OrgStatus }>()

const { t } = useI18n()
</script>

<template>
  <span class="status">
    <span class="badge" :class="`sales-${status.sales}`">
      {{ t(`status.sales.${status.sales}`) }}
    </span>
    <span
      v-if="!hidesCongestion(status.sales) && status.congestion"
      class="badge"
      :class="`congestion-${status.congestion}`"
    >
      {{ t(`status.congestion.${status.congestion}`) }}
    </span>
  </span>
</template>

<style scoped>
.status {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  .badge {
    padding: 2px 8px;
    border: 1px solid var(--color-border);
    font-size: 10px;
    line-height: 1.4;
    white-space: nowrap;

    &.sales-soldout,
    &.congestion-high {
      border-color: var(--color-heading);
      background: var(--color-heading);
      color: var(--color-background);
    }
  }
}
</style>
