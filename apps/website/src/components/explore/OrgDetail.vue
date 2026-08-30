<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { organizationName } from '@/config/organizations'
import type { Organization } from '@/config/organizations'
import type { OrgStatus } from '@shared/status'
import OrgImage from './OrgImage.vue'
import OrgStatusBadges from './OrgStatusBadges.vue'

const props = defineProps<{ org: Organization; status?: OrgStatus; imageAlt?: string }>()

const { t, locale } = useI18n()

const displayName = computed(() => organizationName(props.org, locale.value))
const alt = computed(() => props.imageAlt || displayName.value || t('explore.events.tbd'))
</script>

<template>
  <span class="org-detail">
    <OrgImage :src="org.image" :alt="alt" />
    <OrgStatusBadges v-if="status" :status="status" />
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
