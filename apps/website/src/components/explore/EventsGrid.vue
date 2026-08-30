<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { classNumbers, organizations } from '@/config/organizations'
import type { Organization } from '@/config/organizations'
import {
  buildEventRows,
  columnTracks,
  findCellPosition,
  GAP,
  GUTTER,
  INLINE_PADDING,
  rowTracks,
} from '@/lib/eventsGrid'
import type { OrgStatus } from '@shared/status'
import EventsGridCell from './EventsGridCell.vue'

const props = defineProps<{
  selectedId?: string
  statuses?: ReadonlyMap<string, OrgStatus>
}>()

const emit = defineEmits<{ select: [id: string | null] }>()

const { t } = useI18n()

const rows = computed(() => buildEventRows(organizations))

const selectedPos = computed(() =>
  props.selectedId ? findCellPosition(rows.value, props.selectedId) : null,
)

const scrollStyle = {
  '--gutter': `${GUTTER}px`,
  '--gap': `${GAP}px`,
  '--inline-padding': `${INLINE_PADDING}px`,
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `${GUTTER}px ${columnTracks(classNumbers.length, selectedPos.value?.col ?? null)}`,
  gridTemplateRows: `${GUTTER}px ${rowTracks(rows.value, selectedPos.value?.row ?? null)}`,
}))

const scrolled = ref(false)

function onScroll(event: Event) {
  scrolled.value = (event.target as HTMLElement).scrollLeft > 0
}

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
  <div class="grid-scroll" :class="{ scrolled }" :style="scrollStyle" @scroll.passive="onScroll">
    <div
      ref="gridRef"
      class="events-grid"
      :style="gridStyle"
      role="group"
      :aria-label="t('explore.events.gridLabel')"
      @transitionend.self="scrollSelectedIntoView"
    >
      <div class="gutter corner" aria-hidden="true"></div>
      <div v-for="classNo in classNumbers" :key="classNo" class="gutter col-head">
        {{ t('explore.events.classHeader', { classNo }) }}
      </div>

      <template v-for="(row, rowIndex) in rows" :key="row.id">
        <template v-if="row.spacer">
          <div class="gutter corner" aria-hidden="true"></div>
          <div
            v-for="classNo in classNumbers"
            :key="classNo"
            class="gutter"
            aria-hidden="true"
          ></div>
        </template>
        <template v-else>
          <div class="gutter row-head">
            {{ row.labelKey ? t(row.labelKey, row.labelParams ?? {}) : '' }}
          </div>
          <EventsGridCell
            v-for="(cell, colIndex) in row.cells"
            :key="cell?.id ?? `${row.id}-${colIndex}`"
            :org="cell"
            :expanded="isExpanded(rowIndex, colIndex)"
            :status="cell ? statuses?.get(cell.id) : undefined"
            @select="onSelect(cell)"
          >
            <template #actions>
              <slot name="cell-actions" :org="cell"></slot>
            </template>
          </EventsGridCell>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.grid-scroll {
  --head-shadow-color: oklch(0% 0 0 / 0.3);

  padding: 24px var(--inline-padding) 48px;
  overflow-x: auto;
  scroll-padding-inline-start: calc(var(--inline-padding) + var(--gutter) + var(--gap));

  html[data-theme='dark'] & {
    --head-shadow-color: oklch(100% 0 0 / 0.25);
  }

  &.scrolled {
    --head-shadow: 8px 0 12px -6px var(--head-shadow-color);
  }
}

.events-grid {
  display: grid;
  /* sticky な行見出しがトラック全幅を追随できるよう，はみ出す分まで箱を広げる */
  width: max-content;
  gap: var(--gap);
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
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    white-space: nowrap;

    &.row-head,
    &.corner {
      position: sticky;
      left: 0;
      z-index: 1;
      box-shadow:
        calc(-1 * var(--inline-padding)) 0 0 var(--color-background),
        var(--head-shadow, 0 0 0 0 transparent);
      transition: box-shadow 0.2s;
    }

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
