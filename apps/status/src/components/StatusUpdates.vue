<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { STATUS_ORG_IDS } from '@shared/status'
import type { OrgStatus } from '@shared/status'
import { useStatusPolling } from '@/composables/useStatusPolling'
import { timeTicks } from '@/lib/historyChart'
import { classOrgLabel } from '@/lib/orgLabel'
import { formatElapsed } from '@/lib/relativeTime'
import { domainRatio, formatClock, updateRows, updatesDomain } from '@/lib/updatesChart'
import { css, cx } from '@styled/css'
import { hint, sectionLabel } from '@styled/recipes'

const props = defineProps<{
  token: string
  statuses: OrgStatus[]
  orgId: string
  /** False while another tab of the admin screen is showing, which pauses the polling. */
  active: boolean
}>()

const emit = defineEmits<{
  statuses: [OrgStatus[]]
  select: [string]
}>()

const { checkedAt, failed } = useStatusPolling(
  () => props.token,
  () => props.statuses,
  () => props.active,
  (list) => emit('statuses', list),
)

const now = ref(Math.floor(Date.now() / 1000))
const trackWidth = ref(480)
const axis = useTemplateRef<HTMLElement>('axis')

const rows = computed(() => updateRows(STATUS_ORG_IDS, props.statuses))
const sent = computed(() => rows.value.filter((row) => row.updatedAt !== null).length)
const domain = computed(() => updatesDomain(rows.value, now.value))
const ticks = computed(() =>
  timeTicks(domain.value, Math.max(2, Math.floor(trackWidth.value / 96))).map((tick) => {
    const ratio = domainRatio(tick.t, domain.value)
    return { ...tick, left: percent(ratio), align: tickAlign(ratio * trackWidth.value) }
  }),
)

function percent(ratio: number) {
  return `${(ratio * 100).toFixed(3)}%`
}

// A save older than the axis starts at its left edge, square, to show it runs on past it.
function bar(updatedAt: number) {
  const start = domainRatio(updatedAt, domain.value)
  return {
    style: { width: percent(1 - start) },
    clipped: updatedAt < domain.value.from,
  }
}

// A label near either end of the axis keeps inside it instead of centring on the edge.
function tickAlign(px: number) {
  if (px < 32) return 'start'
  if (px > trackWidth.value - 32) return 'end'
  return 'middle'
}

// A fresh list moves the right edge too, so a save shows up as a sliver at once.
watch(
  () => props.statuses,
  () => (now.value = Math.floor(Date.now() / 1000)),
)

let clockTimer: ReturnType<typeof setInterval> | undefined
let observer: ResizeObserver | undefined

onMounted(() => {
  clockTimer = setInterval(() => (now.value = Math.floor(Date.now() / 1000)), 30_000)
  observer = new ResizeObserver(([entry]) => {
    if (entry) trackWidth.value = Math.round(entry.contentRect.width)
  })
  if (axis.value) observer.observe(axis.value)
})

onUnmounted(() => {
  clearInterval(clockTimer)
  observer?.disconnect()
})

const styles = {
  head: css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: '4px 12px',
    marginBottom: '10px',
  }),
  title: sectionLabel(),
  meta: cx(hint(), css({ fontVariantNumeric: 'tabular-nums' })),
  failure: css({ color: 'status.bad', fontSize: '12px', fontWeight: 'bold' }),
  chart: css({
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    columnGap: '12px',
    margin: 0,
    padding: 0,
    listStyle: 'none',
    '@container admin-window (max-width: 520px)': {
      columnGap: '8px',
    },
  }),
  item: css({ display: 'grid', gridColumn: '1 / -1', gridTemplateColumns: 'subgrid' }),
  row: css({
    display: 'grid',
    gridColumn: '1 / -1',
    gridTemplateColumns: 'subgrid',
    alignItems: 'center',
    minHeight: '28px',
    padding: '0 4px',
    fontSize: '12px',
    textAlign: 'start',
    cursor: 'pointer',
    transition: 'background token(durations.base) ease',
    _hover: { background: 'surfaceSoft' },
    '&[aria-current=true]': {
      background: 'surfaceSoft',
      '& [data-label]': { color: 'textStrong', fontWeight: 'bold' },
      '& [data-bar]': { background: 'accent' },
    },
  }),
  label: css({ color: 'textMute', truncate: true }),
  track: css({ position: 'relative', alignSelf: 'stretch', minHeight: '28px' }),
  gridline: css({
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '1px',
    background: 'border',
  }),
  bar: css({
    position: 'absolute',
    top: '50%',
    right: 0,
    minWidth: '4px',
    height: '10px',
    borderRadius: '4px 0 0 4px',
    background: 'chart.elapsed',
    translate: '0 -50%',
    transition: 'width token(durations.base) ease',
    '&[data-clipped]': { borderRadius: 0 },
  }),
  when: css({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  }),
  clock: css({
    color: 'text',
    '@container admin-window (max-width: 520px)': { display: 'none' },
  }),
  elapsed: css({ color: 'textMute' }),
  never: css({ color: 'textMute' }),
  axis: css({
    position: 'relative',
    gridColumn: 2,
    height: '20px',
    marginTop: '4px',
    borderTop: '1px solid token(colors.borderStrong)',
  }),
  tick: css({
    position: 'absolute',
    top: '5px',
    color: 'textMute',
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    translate: '-50% 0',
    '&[data-align=start]': { translate: '0 0' },
    '&[data-align=end]': { translate: '-100% 0' },
  }),
}
</script>

<template>
  <section>
    <div :class="styles.head">
      <h3 :class="styles.title">最終更新</h3>
      <span :class="styles.meta">
        送信済み {{ sent }} / {{ rows.length }} 団体 · {{ formatClock(checkedAt, now) }} 時点
      </span>
      <span v-if="failed" :class="styles.failure" role="status">最新の取得に失敗しました</span>
    </div>

    <ol :class="styles.chart">
      <li v-for="row in rows" :key="row.orgId" :class="styles.item">
        <button
          type="button"
          :class="styles.row"
          :aria-current="row.orgId === orgId ? 'true' : undefined"
          @click="emit('select', row.orgId)"
        >
          <span :class="styles.label" data-label>{{ classOrgLabel(row.orgId) }}</span>
          <span :class="styles.track" aria-hidden="true">
            <span
              v-for="tick in ticks"
              :key="tick.t"
              :class="styles.gridline"
              :style="{ left: tick.left }"
            />
            <span
              v-if="row.updatedAt !== null"
              :class="styles.bar"
              :style="bar(row.updatedAt).style"
              :data-clipped="bar(row.updatedAt).clipped ? '' : undefined"
              data-bar
            />
          </span>
          <span v-if="row.updatedAt !== null" :class="styles.when">
            <time :class="styles.clock" :datetime="new Date(row.updatedAt * 1000).toISOString()">
              {{ formatClock(row.updatedAt, now) }}
            </time>
            <span :class="styles.elapsed">{{ formatElapsed(row.updatedAt, now) }}</span>
          </span>
          <span v-else :class="cx(styles.when, styles.never)">未送信</span>
        </button>
      </li>
      <li ref="axis" :class="styles.axis" aria-hidden="true">
        <span
          v-for="tick in ticks"
          :key="tick.t"
          :class="styles.tick"
          :style="{ left: tick.left }"
          :data-align="tick.align"
        >
          {{ tick.label }}
        </span>
      </li>
    </ol>
  </section>
</template>
