<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { organizationGroupName, organizationProjectName } from '@/lib/organization'
import type { Organization } from '@/data/organizations'
import type { OrgStatus } from '@shared/status'
import OrgDetail from './OrgDetail.vue'
import OrgStatusBadges from './OrgStatusBadges.vue'

const props = defineProps<{ org: Organization | null; expanded: boolean; status?: OrgStatus }>()

defineEmits<{ select: [] }>()

const { t, locale } = useI18n()

const groupName = computed(() =>
  props.org ? organizationGroupName(props.org, locale.value, t) : '',
)

const projectName = computed(() =>
  props.org ? organizationProjectName(props.org, locale.value) : '',
)
</script>

<template>
  <div v-if="org" class="cell" :class="{ expanded }">
    <div class="head-row">
      <button type="button" class="cell-head" :aria-expanded="expanded" @click="$emit('select')">
        <span class="label">{{ groupName }}</span>
        <span v-if="projectName" class="name">{{ projectName }}</span>
      </button>
      <OrgStatusBadges v-if="!expanded && status" :status="status" class="cell-status" />
    </div>
    <Transition name="detail-fade">
      <div v-if="expanded" class="detail">
        <OrgDetail :org="org" :status="status">
          <template #actions>
            <slot name="actions"></slot>
          </template>
        </OrgDetail>
      </div>
    </Transition>
  </div>
  <div v-else class="cell blank" aria-hidden="true"></div>
</template>

<style scoped>
.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  min-height: 0;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  color: var(--color-text);
  overflow: hidden;
  transition:
    border-color 0.15s,
    color 0.15s;

  &:hover {
    border-color: var(--color-border-hover);
    color: var(--color-heading);
  }

  &.expanded {
    border-color: var(--color-heading);
    color: var(--color-heading);
  }

  &.blank {
    border-style: dashed;
    cursor: default;
    pointer-events: none;
  }

  .head-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    .cell-status {
      flex-direction: column;
      flex-shrink: 0;
      align-items: flex-end;
      gap: 6px;
    }
  }

  .cell-head {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    /* Stretch the hit area over the whole cell */
    &::after {
      content: '';
      position: absolute;
      inset: 0;
    }

    .label {
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

.cell-status :deep(.badge) {
  padding: 1px 6px;
  line-height: 1.2;
}

/* Only the controls in the detail sit above that hit area */
.cell :deep(.org-detail :is(a, button)) {
  position: relative;
}

/*
 * Kept at its natural size and revealed by the row track, which the grid eases.
 * The fixed width keeps that size off the animating column, so the row can be
 * measured while it moves.
 */
.detail {
  flex: none;
  width: var(--expanded-content);
}

/* Same duration as the row, so the content outlives the collapse */
.detail-fade-enter-active,
.detail-fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.detail-fade-enter-from,
.detail-fade-leave-to {
  opacity: 0;
}
</style>
