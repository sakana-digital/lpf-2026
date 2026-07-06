<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { classNumbers, organizations } from '@/config/organizations'
import type { Organization } from '@/config/organizations'
import { buildEventRows, columnTracks, findCellPosition, rowTracks } from '@/lib/eventsGrid'
import EventsGridCell from './EventsGridCell.vue'

const props = defineProps<{ selectedId?: string }>()

const emit = defineEmits<{ select: [id: string | null] }>()

const { t } = useI18n()

const rows = computed(() => buildEventRows(organizations))

const selectedPos = computed(() =>
  props.selectedId ? findCellPosition(rows.value, props.selectedId) : null,
)

const gridStyle = computed(() => ({
  gridTemplateColumns: `40px ${columnTracks(classNumbers.length, selectedPos.value?.col ?? null)}`,
  gridTemplateRows: `32px ${rowTracks(rows.value.length, selectedPos.value?.row ?? null)}`,
}))

function onSelect(org: Organization | null) {
  if (!org) return
  emit('select', org.id === props.selectedId ? null : org.id)
}

function isExpanded(rowIndex: number, colIndex: number): boolean {
  return selectedPos.value?.row === rowIndex && selectedPos.value?.col === colIndex
}

const gridRef = useTemplateRef<HTMLElement>('gridRef')

// グリッドトラックの遷移後に呼ばれ，展開セルを可視範囲へ収める
function scrollSelectedIntoView() {
  if (!props.selectedId) return
  gridRef.value
    ?.querySelector('.cell.expanded')
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

onMounted(scrollSelectedIntoView)
</script>

<template>
  <div
    ref="gridRef"
    class="events-grid"
    :style="gridStyle"
    :aria-label="t('explore.events.gridLabel')"
    @transitionend.self="scrollSelectedIntoView"
  >
    <div class="gutter corner" aria-hidden="true"></div>
    <div v-for="classNo in classNumbers" :key="classNo" class="gutter col-head">
      {{ t('explore.events.classHeader', { classNo }) }}
    </div>

    <template v-for="(row, rowIndex) in rows" :key="row.id">
      <div class="gutter row-head">
        {{ t(row.labelKey, row.labelParams ?? {}) }}
      </div>
      <EventsGridCell
        v-for="(cell, colIndex) in row.cells"
        :key="cell?.id ?? `${row.id}-${colIndex}`"
        :org="cell"
        :expanded="isExpanded(rowIndex, colIndex)"
        @select="onSelect(cell)"
      >
        <template #actions>
          <slot name="cell-actions" :org="cell"></slot>
        </template>
      </EventsGridCell>
    </template>
  </div>
</template>

<style scoped>
.events-grid {
  display: grid;
  gap: 8px;
  transition:
    grid-template-columns 0.3s cubic-bezier(0.22, 1, 0.36, 1),
    grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  .gutter {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    background: var(--color-heading);
    color: var(--color-background);
    font-size: 11px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    white-space: nowrap;

    &.row-head {
      writing-mode: vertical-rl;
      padding: 8px 0;
    }

    &.col-head {
      padding: 0 4px;
    }
  }
}
</style>
