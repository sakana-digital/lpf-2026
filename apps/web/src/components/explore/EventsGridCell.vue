<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { organizationName } from '@/config/organizations'
import type { Organization } from '@/config/organizations'
import type { OrgStatus } from '../../../../../shared/status'
import OrgDetail from './OrgDetail.vue'

const props = defineProps<{ org: Organization | null; expanded: boolean; status?: OrgStatus }>()

defineEmits<{ select: [] }>()

const { t, locale } = useI18n()

const displayName = computed(() => (props.org ? organizationName(props.org, locale.value) : ''))

const cellLabel = computed(() => {
  if (!props.org) return ''
  return props.org.kind === 'class'
    ? t('explore.events.classLabel', { grade: props.org.grade, classNo: props.org.classNo })
    : displayName.value
})
</script>

<template>
  <button
    v-if="org"
    class="cell"
    :class="{ expanded }"
    :aria-expanded="expanded"
    @click="$emit('select')"
  >
    <span class="cell-head">
      <span class="label">{{ cellLabel }}</span>
      <span class="name" :class="{ tbd: !displayName }">
        {{ displayName || t('explore.events.tbd') }}
      </span>
    </span>
    <Transition name="detail">
      <OrgDetail v-if="expanded" :org="org" :status="status" :image-alt="displayName || cellLabel">
        <template #actions>
          <slot name="actions"></slot>
        </template>
      </OrgDetail>
    </Transition>
  </button>
  <div v-else class="cell blank" aria-hidden="true"></div>
</template>

<style scoped>
.cell {
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
  font: inherit;
  text-align: left;
  cursor: pointer;
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

  .cell-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .label {
      font-size: 12px;
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    .name {
      overflow: hidden;
      color: var(--color-text-mute);
      font-size: 11px;
      line-height: 1.3;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}

.detail-enter-active {
  transition: opacity 0.25s ease-out 0.1s;
}

.detail-enter-from {
  opacity: 0;
}
</style>
