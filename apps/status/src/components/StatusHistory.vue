<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, useTemplateRef, watch } from 'vue'
import { CONGESTION_LEVELS, SALES_STATUSES, STATUS_HISTORY_LIMIT } from '@shared/status'
import type { OrgStatus, StatusHistoryEntry } from '@shared/status'
import { festivalDates, festivalHours, parseTime } from '@shared/timetable'
import { getStatusHistory } from '@/lib/api'
import { CONGESTION_LABELS, SALES_LABELS, SOURCE_LABELS } from '@/lib/statusLabel'
import {
  chronological,
  clampDomain,
  congestionLevel,
  dayDomain,
  entryAt,
  formatTime,
  fullDomain,
  linePath,
  panDomain,
  salesLevel,
  sameDomain,
  timeTicks,
  unionDomain,
  zoomDomain,
  type Domain,
} from '@/lib/historyChart'
import { css, cva, cx } from '@styled/css'
import { button, hint, resultBadge } from '@styled/recipes'
import { SALES_TONES, statusDot } from '@/styles/status'

const props = defineProps<{
  token: string
  orgId: string
  /** Only its `updatedAt` is read: a save for this group means a new log row. */
  status: OrgStatus | null
}>()

// The day views show the opening hours only, so the visits land in the middle of the chart.
const DAYS = festivalDates.map((date, index) => ({
  label: `Day ${index + 1}`,
  domain: dayDomain(date, parseTime(festivalHours.open) / 60, parseTime(festivalHours.close) / 60),
}))

// Geometry in CSS pixels; the SVG is as wide as the window.
const LEFT = 84
const RIGHT = 12
const TOP = 10
const TITLE = 22
const ROW = 22
const GAP = 14
const BOTTOM = 28
const SALES_TOP = TOP + TITLE
const CONGESTION_TITLE_TOP = SALES_TOP + SALES_STATUSES.length * ROW + GAP
const CONGESTION_TOP = CONGESTION_TITLE_TOP + TITLE
const HEIGHT = CONGESTION_TOP + CONGESTION_LEVELS.length * ROW + BOTTOM

const clipId = useId()

const entries = ref<StatusHistoryEntry[]>([])
const loading = ref(false)
const failed = ref(false)
let requestId = 0

const now = ref(Math.floor(Date.now() / 1000))
// null follows the log as it grows; a value is a range the user chose.
const domain = ref<Domain | null>(null)
const width = ref(640)
const hover = ref<number | null>(null)
let pressed: { x: number; domain: Domain } | null = null
const dragging = ref(false)

const wrapper = useTemplateRef<HTMLElement>('wrapper')
const svg = useTemplateRef<SVGSVGElement>('svg')

const updatedAt = computed(() => props.status?.updatedAt ?? null)

const logDomain = computed(() => fullDomain(entries.value, now.value))
const bounds = computed(() => unionDomain(logDomain.value, ...DAYS.map((day) => day.domain)))
const view = computed(() => clampDomain(domain.value ?? logDomain.value, bounds.value))
const plotWidth = computed(() => Math.max(40, width.value - LEFT - RIGHT))

function x(t: number) {
  return LEFT + ((t - view.value.from) / (view.value.to - view.value.from)) * plotWidth.value
}

// A tick on the edge of the plot keeps its label inside instead of centring on the border.
function tickAnchor(t: number): 'start' | 'middle' | 'end' {
  const px = x(t)
  if (px <= LEFT + 1) return 'start'
  if (px >= LEFT + plotWidth.value - 1) return 'end'
  return 'middle'
}
function rowY(top: number, level: number) {
  return top + level * ROW + ROW / 2
}

// The two strips differ only in where they sit and which field they read.
const STRIPS = [
  {
    kind: 'sales',
    title: '販売状況',
    top: SALES_TOP,
    labels: SALES_STATUSES.map((value) => SALES_LABELS[value]),
    level: (entry: StatusHistoryEntry) => salesLevel(entry.sales),
  },
  {
    kind: 'congestion',
    title: '混雑状況',
    top: CONGESTION_TOP,
    labels: CONGESTION_LEVELS.map((value) => CONGESTION_LABELS[value]),
    level: (entry: StatusHistoryEntry) => congestionLevel(entry.congestion),
  },
] as const

const strips = computed(() =>
  STRIPS.map((strip) => {
    const points = entries.value.map((entry) => ({ t: entry.createdAt, level: strip.level(entry) }))
    const y = (level: number) => rowY(strip.top, level)
    return {
      kind: strip.kind,
      title: strip.title,
      top: strip.top,
      labels: strip.labels,
      path: linePath(points, x, y),
      markers: points.flatMap((point) =>
        point.level === null ? [] : [{ cx: x(point.t), cy: y(point.level) }],
      ),
    }
  }),
)
const ticks = computed(() => timeTicks(view.value, Math.max(2, Math.floor(plotWidth.value / 96))))
const hovered = computed(() => (hover.value === null ? null : entryAt(entries.value, hover.value)))
const tooltipLeft = computed(() => {
  if (hover.value === null) return 0
  return Math.min(Math.max(x(hover.value) + 12, 0), Math.max(0, width.value - 180))
})
const newestFirst = computed(() => [...entries.value].reverse())

async function reload() {
  if (!props.orgId) return
  // Switching groups mid-request must not let the older answer land.
  const id = ++requestId
  loading.value = true
  failed.value = false
  try {
    const list = await getStatusHistory(props.token, props.orgId)
    if (id === requestId) {
      entries.value = chronological(list)
      now.value = Math.floor(Date.now() / 1000)
    }
  } catch {
    if (id === requestId) failed.value = true
  } finally {
    if (id === requestId) loading.value = false
  }
}

// `updatedAt` also changes when the group does, so one watcher keeps that a single fetch.
// A status just saved for this group is in the log already.
watch(
  [() => props.orgId, updatedAt],
  ([orgId], previous) => {
    if (previous?.[0] !== orgId) {
      entries.value = []
      domain.value = null
      hover.value = null
    }
    void reload()
  },
  { immediate: true },
)

// Measuring per pointermove would read layout right after the crosshair dirtied it.
let plotLeft: number | null = null

function forgetPlotLeft() {
  plotLeft = null
}

function timeAt(clientX: number) {
  if (plotLeft === null) {
    const rect = svg.value?.getBoundingClientRect()
    if (!rect) return view.value.from
    plotLeft = rect.left
  }
  const ratio = (clientX - plotLeft - LEFT) / plotWidth.value
  const t = view.value.from + ratio * (view.value.to - view.value.from)
  return Math.min(Math.max(t, view.value.from), view.value.to)
}

function onPointerDown(event: PointerEvent) {
  forgetPlotLeft()
  pressed = { x: event.clientX, domain: view.value }
  svg.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (pressed) {
    const dx = event.clientX - pressed.x
    if (dragging.value || Math.abs(dx) > 3) {
      dragging.value = true
      hover.value = null
      const span = pressed.domain.to - pressed.domain.from
      domain.value = panDomain(pressed.domain, (-dx / plotWidth.value) * span, bounds.value)
      return
    }
  }
  hover.value = timeAt(event.clientX)
}

function onPointerUp() {
  pressed = null
  dragging.value = false
}

function onPointerLeave() {
  if (!pressed) hover.value = null
}

function onWheel(event: WheelEvent) {
  const factor = 2 ** (-event.deltaY / 240)
  domain.value = zoomDomain(view.value, timeAt(event.clientX), factor, bounds.value)
}

function showAll() {
  domain.value = null
}

function showDay(day: Domain) {
  domain.value = day
}

// The chart mounts only once the log has loaded, so the observer follows the element.
watch(wrapper, (element, _previous, onCleanup) => {
  if (!element) return
  const observer = new ResizeObserver(([entry]) => {
    forgetPlotLeft()
    if (entry) width.value = Math.round(entry.contentRect.width)
  })
  observer.observe(element)
  // Capture, so a scroll in any ancestor counts too.
  window.addEventListener('scroll', forgetPlotLeft, { capture: true, passive: true })
  onCleanup(() => {
    observer.disconnect()
    window.removeEventListener('scroll', forgetPlotLeft, { capture: true })
  })
})

let clock: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  clock = setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 60000)
})

onUnmounted(() => clearInterval(clock))

const series = cva({
  base: {},
  variants: {
    kind: {
      sales: { color: 'chart.sales' },
      congestion: { color: 'chart.congestion' },
    },
  },
})

const styles = {
  toolbar: css({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '8px',
  }),
  toolbarHint: cx(
    hint(),
    css({
      marginLeft: 'auto',
      '@container admin-window (max-width: 600px)': { display: 'none' },
    }),
  ),
  wrapper: css({ position: 'relative', minWidth: 0 }),
  svg: css({
    display: 'block',
    width: '100%',
    touchAction: 'none',
    userSelect: 'none',
    cursor: 'crosshair',
    '&[data-dragging]': { cursor: 'grabbing' },
  }),
  rowLabel: css({ fill: 'textMute', fontSize: '11px' }),
  stripTitle: css({ fill: 'text', fontSize: '12px', fontWeight: 'bold' }),
  stripKey: css({ stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' }),
  gridline: css({ stroke: 'border', strokeWidth: 1 }),
  tickText: css({ fill: 'textMute', fontSize: '11px', fontVariantNumeric: 'tabular-nums' }),
  line: css({
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  }),
  marker: css({ fill: 'currentColor', stroke: 'surface', strokeWidth: 2 }),
  crosshair: css({ stroke: 'borderStrong', strokeWidth: 1 }),
  tooltip: css({
    position: 'absolute',
    top: '4px',
    display: 'grid',
    gap: '3px',
    minWidth: '150px',
    padding: '8px 10px',
    border: '1px solid token(colors.border)',
    background: 'surface',
    fontSize: '12px',
    pointerEvents: 'none',
  }),
  tooltipTime: cx(hint(), css({ fontVariantNumeric: 'tabular-nums' })),
  tooltipValue: css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 'bold',
    _before: { content: '""', width: '14px', height: '2px', background: 'currentColor' },
  }),
  tooltipText: css({ color: 'text' }),
  empty: cx(hint(), css({ padding: '12px 0' })),
  failure: cx(resultBadge({ tone: 'error' }), css({ margin: '12px auto 0' })),
  details: css({ marginTop: '12px' }),
  summary: cx(hint(), css({ marginBottom: '8px' })),
  list: css({
    maxHeight: '320px',
    marginTop: '8px',
    padding: 0,
    overflowY: 'auto',
    listStyle: 'none',
  }),
  row: css({
    display: 'grid',
    gridTemplateColumns: '7.5em minmax(0, 1fr) minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: '10px',
    padding: '7px 4px',
    borderBottom: '1px solid token(colors.border)',
    fontSize: '13px',
    _last: { borderBottom: 0 },
  }),
  time: css({ color: 'textMute', fontVariantNumeric: 'tabular-nums' }),
  mute: css({ color: 'textMute' }),
  source: css({ color: 'textMute', fontSize: '12px' }),
}
</script>

<template>
  <section>
    <p v-if="failed" :class="styles.failure" role="status">履歴の取得に失敗しました。</p>
    <p v-else-if="loading && entries.length === 0" :class="styles.empty">読み込み中…</p>
    <p v-else-if="entries.length === 0" :class="styles.empty">この団体の更新はまだありません。</p>
    <template v-else>
      <div :class="styles.toolbar">
        <button
          type="button"
          :class="button({ variant: 'ghost', size: 'sm' })"
          :aria-pressed="sameDomain(view, clampDomain(logDomain, bounds))"
          @click="showAll"
        >
          全期間
        </button>
        <button
          v-for="day in DAYS"
          :key="day.label"
          type="button"
          :class="button({ variant: 'ghost', size: 'sm' })"
          :aria-pressed="sameDomain(view, day.domain)"
          @click="showDay(day.domain)"
        >
          {{ day.label }}
        </button>
        <span :class="styles.toolbarHint">ドラッグで移動、ホイールで拡大</span>
      </div>

      <div ref="wrapper" :class="styles.wrapper">
        <svg
          ref="svg"
          :class="styles.svg"
          :viewBox="`0 0 ${width} ${HEIGHT}`"
          :height="HEIGHT"
          :data-dragging="dragging ? '' : undefined"
          role="img"
          aria-label="販売状況と混雑状況の推移"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @pointerleave="onPointerLeave"
          @wheel.prevent="onWheel"
          @dblclick="showAll"
        >
          <defs>
            <clipPath :id="clipId">
              <rect :x="LEFT" :y="TOP" :width="plotWidth" :height="HEIGHT - TOP - BOTTOM" />
            </clipPath>
          </defs>

          <template v-for="strip in strips" :key="strip.kind">
            <g :class="series({ kind: strip.kind })">
              <line
                :class="styles.stripKey"
                :x1="LEFT"
                :x2="LEFT + 14"
                :y1="strip.top - 9"
                :y2="strip.top - 9"
              />
              <text :class="styles.stripTitle" :x="LEFT + 20" :y="strip.top - 5">
                {{ strip.title }}
              </text>
            </g>
            <g v-for="(label, level) in strip.labels" :key="label">
              <line
                :class="styles.gridline"
                :x1="LEFT"
                :x2="LEFT + plotWidth"
                :y1="rowY(strip.top, level)"
                :y2="rowY(strip.top, level)"
              />
              <text
                :class="styles.rowLabel"
                :x="LEFT - 10"
                :y="rowY(strip.top, level)"
                text-anchor="end"
                dominant-baseline="middle"
              >
                {{ label }}
              </text>
            </g>
          </template>

          <g v-for="tick in ticks" :key="tick.t">
            <line
              :class="styles.gridline"
              :x1="x(tick.t)"
              :x2="x(tick.t)"
              :y1="HEIGHT - BOTTOM + 2"
              :y2="HEIGHT - BOTTOM + 8"
            />
            <text
              :class="styles.tickText"
              :x="x(tick.t)"
              :y="HEIGHT - 8"
              :text-anchor="tickAnchor(tick.t)"
            >
              {{ tick.label }}
            </text>
          </g>

          <g :clip-path="`url(#${clipId})`">
            <g
              v-for="strip in strips"
              :key="strip.kind"
              v-memo="[strip]"
              :class="series({ kind: strip.kind })"
            >
              <path :class="styles.line" :d="strip.path" />
              <circle
                v-for="(marker, index) in strip.markers"
                :key="index"
                :class="styles.marker"
                :cx="marker.cx"
                :cy="marker.cy"
                r="4"
              />
            </g>
          </g>

          <line
            v-if="hover !== null"
            :class="styles.crosshair"
            :x1="x(hover)"
            :x2="x(hover)"
            :y1="TOP"
            :y2="HEIGHT - BOTTOM + 8"
          />
        </svg>

        <div
          v-if="hover !== null"
          :class="styles.tooltip"
          :style="{ left: `${tooltipLeft}px` }"
          aria-hidden="true"
        >
          <span :class="styles.tooltipTime">{{ formatTime(hover) }}</span>
          <template v-if="hovered">
            <span :class="cx(series({ kind: 'sales' }), styles.tooltipValue)">
              <span :class="styles.tooltipText">{{ SALES_LABELS[hovered.sales] }}</span>
            </span>
            <span :class="cx(series({ kind: 'congestion' }), styles.tooltipValue)">
              <span :class="styles.tooltipText">
                {{ hovered.congestion ? CONGESTION_LABELS[hovered.congestion] : '—' }}
              </span>
            </span>
            <span :class="styles.source">
              {{ formatTime(hovered.createdAt) }} · {{ SOURCE_LABELS[hovered.source] }}
            </span>
          </template>
          <span v-else :class="styles.mute">まだ送信がありません。</span>
        </div>
      </div>

      <section :class="styles.details">
        <h3 :class="styles.summary">一覧（新しい順・最大 {{ STATUS_HISTORY_LIMIT }} 件）</h3>
        <ol :class="styles.list" v-memo="[newestFirst]">
          <li v-for="entry in newestFirst" :key="entry.createdAt" :class="styles.row">
            <time :class="styles.time" :datetime="new Date(entry.createdAt * 1000).toISOString()">
              {{ formatTime(entry.createdAt) }}
            </time>
            <span :class="statusDot({ tone: SALES_TONES[entry.sales] })">
              {{ SALES_LABELS[entry.sales] }}
            </span>
            <span :class="styles.mute">
              {{ entry.congestion ? CONGESTION_LABELS[entry.congestion] : '—' }}
            </span>
            <span :class="styles.source">{{ SOURCE_LABELS[entry.source] }}</span>
          </li>
        </ol>
      </section>
    </template>
  </section>
</template>
