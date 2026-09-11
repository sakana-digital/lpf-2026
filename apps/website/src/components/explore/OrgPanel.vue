<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { organizationGroupName, organizationProjectName } from '@/lib/organization'
import type { Organization } from '@/data/organizations'
import type { OrgStatus } from '@shared/status'
import OrgDetail from './OrgDetail.vue'
import OrgMeta from './OrgMeta.vue'

const props = defineProps<{
  org: Organization
  status?: OrgStatus
}>()

const { t, locale } = useI18n()

const groupName = computed(() => organizationGroupName(props.org, locale.value, t))
const projectName = computed(() => organizationProjectName(props.org, locale.value))
</script>

<template>
  <div class="org-panel">
    <div class="head">
      <div class="info">
        <span class="label">{{ groupName }}</span>
        <span v-if="projectName" class="name">{{ projectName }}</span>
      </div>
      <OrgMeta :place="org.place">
        <slot name="actions"></slot>
      </OrgMeta>
    </div>
    <OrgDetail :org="org" :status="status" />
  </div>
</template>

<style scoped>
.org-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;

  .head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    .info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .label {
      color: var(--color-heading);
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .name {
      overflow: hidden;
      color: var(--color-text-mute);
      font-family: var(--font-text);
      font-size: 11px;
      line-height: 1.3;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}
</style>
