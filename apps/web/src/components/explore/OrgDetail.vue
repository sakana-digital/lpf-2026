<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { organizationName } from '@/config/organizations'
import type { Organization } from '@/config/organizations'
import { hidesCongestion } from '../../../../../shared/status'
import type { OrgStatus } from '../../../../../shared/status'
import OrgImage from './OrgImage.vue'

const props = defineProps<{ org: Organization; status?: OrgStatus; imageAlt?: string }>()

const { t, locale } = useI18n()

const displayName = computed(() => organizationName(props.org, locale.value))
const alt = computed(() => props.imageAlt || displayName.value || t('explore.events.tbd'))
</script>

<template>
  <span class="org-detail">
    <OrgImage :src="org.image" :alt="alt" />
    <span v-if="status" class="status">
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
    <span class="meta">
      <span v-if="org.location" class="location">
        {{ t('explore.events.location', { floor: org.location.floor }) }}
      </span>
      <slot name="actions"></slot>
    </span>
  </span>
</template>

<style scoped>
.org-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;

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

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    .location {
      color: var(--color-text-mute);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
