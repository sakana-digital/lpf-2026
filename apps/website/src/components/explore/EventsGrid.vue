<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { classNumbers, organizations } from '@/data/organizations'
import type { Organization } from '@/data/organizations'
import {
  buildEventRows,
  columnTracks,
  EVENT_COLUMNS,
  EXPANDED_CONTENT,
  findCellPosition,
  SWEEP_DURATION,
  sweepDelay,
  GAP,
  GUTTER,
  INLINE_PADDING,
  rowTracks,
} from '@/lib/eventsGrid'
import type { CellPreview, EventsGrouping, SweepPhase } from '@/lib/eventsGrid'
import type { OrgStatus } from '@shared/status'
import EventsGridCell from './EventsGridCell.vue'

const props = defineProps<{
  grouping: EventsGrouping
  selectedId?: string
  statuses?: ReadonlyMap<string, OrgStatus>
}>()

const emit = defineEmits<{ select: [id: string | null] }>()

const { t } = useI18n()

const rows = computed(() => buildEventRows(organizations, props.grouping))

const selectedPos = computed(() =>
  props.selectedId ? findCellPosition(rows.value, props.selectedId) : null,
)

const scrollStyle = {
  '--gutter': `${GUTTER}px`,
  '--gap': `${GAP}px`,
  '--inline-padding': `${INLINE_PADDING}px`,
  '--expanded-content': EXPANDED_CONTENT,
  '--sweep-duration': `${SWEEP_DURATION}ms`,
}

const expandedHeight = ref<number>()

const gridStyle = computed(() => ({
  gridTemplateColumns: `${GUTTER}px ${columnTracks(classNumbers.length, selectedPos.value?.col ?? null)}`,
  gridTemplateRows: `${GUTTER}px ${rowTracks(rows.value, selectedPos.value?.row ?? null, expandedHeight.value)}`,
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

// The open row and column stretch every cell on them, and that room shows their image
function previewOf(rowIndex: number, colIndex: number): CellPreview | undefined {
  const pos = selectedPos.value
  if (!pos) return undefined
  if (rowIndex === pos.row && colIndex !== pos.col) return 'tall'
  if (colIndex === pos.col && rowIndex !== pos.row) return 'wide'
  return undefined
}

const gridRef = useTemplateRef<HTMLElement>('gridRef')

function scrollSelectedIntoView() {
  if (!props.selectedId) return
  gridRef.value
    ?.querySelector('.cell.expanded')
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

/**
 * The detail is laid out at a fixed width, so its height is already final while
 * the column is still animating. Everything around it comes from the cell's own
 * box, so the row never has to guess.
 */
function measureExpanded() {
  const cell = gridRef.value?.querySelector('.cell.expanded')
  const head = cell?.querySelector('.head-row')
  const detail = cell?.querySelector('.detail')
  if (
    !(cell instanceof HTMLElement && head instanceof HTMLElement && detail instanceof HTMLElement)
  )
    return
  const style = getComputedStyle(cell)
  const chrome = (
    ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth', 'rowGap'] as const
  ).reduce((total, part) => total + parseFloat(style[part]), 0)
  expandedHeight.value = Math.ceil(chrome + head.offsetHeight + detail.offsetHeight)
}

// Keeps the row right when the content itself changes: an image loads, the
// viewport narrows, or the locale swaps the text
const detailResize =
  typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measureExpanded)

function trackExpanded() {
  detailResize?.disconnect()
  const detail = gridRef.value?.querySelector('.cell.expanded .detail')
  if (!detail) return
  measureExpanded()
  detailResize?.observe(detail)
}

watch(() => props.selectedId, trackExpanded, { flush: 'post' })

// Regrouping remounts the open cell, so it is measured and brought back into view
watch(
  () => props.grouping,
  () => {
    trackExpanded()
    scrollSelectedIntoView()
  },
  { flush: 'post' },
)

// Measuring flushes styles, so without this a deep-linked cell would animate open
const animated = ref(false)

// The backdrops start out hidden. Only the tiles leading the sweep are waited
// for: the rest have its travel time to arrive
const SWEEP_LOAD_TIMEOUT = 600
const sweepPhase = ref<SweepPhase>('load')
let sweepTimer: ReturnType<typeof setTimeout> | undefined

async function runSweep() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sweepPhase.value = 'off'
    return
  }
  await nextTick()
  const leading = gridRef.value?.querySelectorAll<HTMLImageElement>('img.backdrop.lead') ?? []
  const loaded = Promise.allSettled(Array.from(leading, (img) => img.decode()))
  await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, SWEEP_LOAD_TIMEOUT))])
  sweepPhase.value = 'run'
  // The bottom-right tile is the last to arrive
  const end = sweepDelay(rows.value.length - 1, EVENT_COLUMNS - 1) + SWEEP_DURATION
  sweepTimer = setTimeout(() => (sweepPhase.value = 'off'), end)
}

onMounted(() => {
  trackExpanded()
  scrollSelectedIntoView()
  requestAnimationFrame(() => (animated.value = true))
  void runSweep()
})

onUnmounted(() => {
  detailResize?.disconnect()
  clearTimeout(sweepTimer)
})
</script>

<template>
  <div class="grid-scroll" :class="{ scrolled }" :style="scrollStyle" @scroll.passive="onScroll">
    <div
      ref="gridRef"
      class="events-grid"
      :class="{ animated }"
      :style="gridStyle"
      role="group"
      :aria-label="t('explore.events.gridLabel')"
      @transitionend.self="scrollSelectedIntoView"
    >
      <div class="gutter corner" aria-hidden="true"></div>
      <div v-for="classNo in classNumbers" :key="classNo" class="gutter col-head">
        <template v-if="grouping === 'group'">
          {{ t('explore.events.classHeader', { classNo }) }}
        </template>
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
            :preview="previewOf(rowIndex, colIndex)"
            :status="cell ? statuses?.get(cell.id) : undefined"
            :sweep-delay="sweepDelay(rowIndex, colIndex)"
            :sweep-phase="sweepPhase"
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
  container-type: inline-size;
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
  /* Widen the box to the tracks so the sticky row head can travel the whole scroll */
  width: max-content;
  gap: var(--gap);
  /* Both tracks are lengths, so width and height run off the same transition */
  &.animated {
    transition:
      grid-template-columns 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  }

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
