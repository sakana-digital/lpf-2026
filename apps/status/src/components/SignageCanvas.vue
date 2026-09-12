<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { hidesCongestion } from '@shared/status'
import type { OrgStatus, SignageConfig } from '@shared/status'
import { classOrgLabel } from '@/lib/orgLabel'
import { footerMessages } from '@/lib/signageTimetable'
import { CONGESTION_LABELS, SIGNAGE_SALES_LABELS } from '@/lib/statusLabel'
import { SIGNAGE_CONGESTION_TONES, SIGNAGE_SALES_TONES, signageBadge } from '@/styles/signage'
import { css, cva, cx } from '@styled/css'

const props = withDefaults(
  defineProps<{
    config: SignageConfig
    orgIds: readonly string[]
    statuses: OrgStatus[]
    videoUrl?: string | null
    audioUrl?: string | null
    connected?: boolean
    clockOffset?: number
  }>(),
  { videoUrl: null, audioUrl: null, connected: true, clockOffset: 0 },
)

const MIN_ROWS = 8
const MAX_ROWS = 12
const ROTATE_MS = 10_000
const CLOCK_MS = 1_000
const tick = ref(0)
const now = ref(new Date(Date.now() + props.clockOffset))
const videoFailed = ref(false)
const soundEnabled = ref(false)
const video = useTemplateRef<HTMLVideoElement>('video')
const audio = useTemplateRef<HTMLAudioElement>('audio')
let rotateTimer: ReturnType<typeof setInterval> | undefined
let clockTimer: ReturnType<typeof setInterval> | undefined

const pageCount = computed(() => Math.max(1, Math.ceil(props.orgIds.length / MAX_ROWS)))
const page = computed(() => tick.value % pageCount.value)
// Spread organizations evenly so the last page is never nearly empty.
const rows = computed(() => Math.max(MIN_ROWS, Math.ceil(props.orgIds.length / pageCount.value)))
const visibleOrgIds = computed(() => {
  const start = page.value * rows.value
  return props.orgIds.slice(start, start + rows.value)
})
const statusMap = computed(() => new Map(props.statuses.map((status) => [status.orgId, status])))
const visibleRows = computed(() =>
  visibleOrgIds.value.map((orgId) => ({ orgId, status: statusMap.value.get(orgId) ?? null })),
)

// The alert wins over the timetable, which in turn wins over the fixed notice.
const alerting = computed(() => props.config.alertEnabled && props.config.alertText !== '')
const footer = computed(() => {
  if (alerting.value) return props.config.alertText
  const messages = footerMessages(now.value)
  if (messages.length === 0) return props.config.footerText
  return messages[tick.value % messages.length]!
})

watch(
  () => props.orgIds.join('\0'),
  () => {
    tick.value = 0
  },
)

function due(startAt: number | null): boolean {
  return startAt !== null && now.value.getTime() >= startAt * 1000
}

const videoReady = computed(
  () => props.config.videoStartAt === null || due(props.config.videoStartAt),
)
const showsVideo = computed(() => props.videoUrl !== null && videoReady.value && !videoFailed.value)

// Unlike the video, silence is the default: the audio needs a time to play at.
const audioScheduled = computed(() => props.audioUrl !== null && props.config.audioStartAt !== null)
const playsAudio = computed(() => audioScheduled.value && due(props.config.audioStartAt))
const needsSound = computed(() => !soundEnabled.value && (showsVideo.value || audioScheduled.value))

watch(
  () => props.videoUrl,
  () => {
    videoFailed.value = false
  },
)

async function play(element: HTMLMediaElement | null): Promise<boolean> {
  if (!element) return true
  try {
    await element.play()
    return true
  } catch {
    return false
  }
}

/** Autoplay only survives while muted, so sound needs a tap on the device. */
async function enableSound() {
  soundEnabled.value = true
  const played = await Promise.all([play(video.value), play(audio.value)])
  if (played.includes(false)) soundEnabled.value = false
}

onMounted(() => {
  rotateTimer = setInterval(() => {
    tick.value += 1
  }, ROTATE_MS)
  clockTimer = setInterval(() => {
    now.value = new Date(Date.now() + props.clockOffset)
  }, CLOCK_MS)
})

onUnmounted(() => {
  clearInterval(rotateTimer)
  clearInterval(clockTimer)
})

const styles = {
  shell: css({
    containerType: 'size',
    display: 'grid',
    placeItems: 'center',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: 'signage.ink',
    color: 'signage.paper',
    fontFamily: 'signage',
    fontWeight: 'bold',
  }),
  frame: css({
    '--gutter': '1.1cqw',
    display: 'grid',
    gridTemplateColumns: '45fr 55fr',
    gridTemplateRows: 'minmax(0, 1fr) 8.9%',
    width: 'min(100vw, calc(100vh * 16 / 9))',
    height: 'min(100vh, calc(100vw * 9 / 16))',
    border: '0.2cqw solid token(colors.signage.paper)',
  }),
  statusPanel: css({
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    minWidth: 0,
    overflow: 'hidden',
    borderRight: '0.22cqw solid token(colors.signage.paper)',
    background:
      'linear-gradient(90deg, transparent 49%, rgb(255 255 255 / 4%) 50%, transparent 51%), radial-gradient(circle, rgb(255 255 255 / 16%) 0 0.07cqw, transparent 0.08cqw) 0 0 / 0.5cqw 0.5cqw, token(colors.signage.panel)',
  }),
  panelHeading: css({
    display: 'flex',
    alignItems: 'end',
    justifyContent: 'space-between',
    padding: '1.55cqw var(--gutter) 1.1cqw',
    borderBottom: '0.17cqw solid token(colors.signage.paper)',
    background: 'signage.paper',
    color: 'signage.ink',
  }),
  eyebrow: css({ fontSize: '0.62cqw', letterSpacing: '0.24em', lineHeight: 1 }),
  title: css({
    marginTop: '0.25cqw',
    fontSize: '1.42cqw',
    fontWeight: 'black',
    letterSpacing: '0.04em',
    lineHeight: 1,
  }),
  pageCount: css({
    padding: '0.2cqw 0.45cqw',
    border: '0.1cqw solid token(colors.signage.ink)',
    fontSize: '0.68cqw',
    fontVariantNumeric: 'tabular-nums',
  }),
  list: css({ display: 'grid', gridTemplateRows: 'repeat(var(--rows), minmax(0, 1fr))' }),
  row: css({
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 8.6cqw 8.6cqw',
    alignItems: 'center',
    gap: '0.55cqw',
    minHeight: 0,
    padding: '0.2cqw var(--gutter)',
    borderBottom: '0.08cqw solid rgb(255 255 255 / 50%)',
    '&:nth-child(even)': {
      background:
        'repeating-linear-gradient(-45deg, rgb(255 255 255 / 7%) 0 0.08cqw, transparent 0.08cqw 0.35cqw)',
    },
  }),
  orgName: css({
    display: 'flex',
    alignItems: 'center',
    gap: '0.6cqw',
    fontSize: '1.3cqw',
    fontWeight: 'black',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    _after: {
      content: '""',
      flex: 1,
      height: '0.09cqw',
      background:
        'repeating-linear-gradient(90deg, rgb(255 255 255 / 45%) 0 0.09cqw, transparent 0.09cqw 0.36cqw)',
    },
  }),
  unreported: cx(
    signageBadge({ tone: 'muted' }),
    css({ gridColumn: '2 / 4', letterSpacing: '0.14em' }),
  ),
  videoPanel: css({
    position: 'relative',
    display: 'grid',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    background: '#000',
    '& video': { width: '100%', height: '100%', objectFit: 'contain' },
    '& audio': { display: 'none' },
  }),
  fallback: css({
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'center',
    background:
      'radial-gradient(circle, #777 0 0.09cqw, transparent 0.1cqw) 0 0 / 0.55cqw 0.55cqw, token(colors.signage.standby)',
  }),
  fallbackTitle: css({
    padding: '0.45cqw 1cqw',
    background: 'signage.paper',
    color: 'signage.ink',
    fontSize: '2.2cqw',
    letterSpacing: '0.18em',
  }),
  fallbackNote: css({
    marginTop: '0.6cqw',
    padding: '0.1cqw 0.4cqw',
    background: 'signage.ink',
    fontSize: '0.72cqw',
    letterSpacing: '0.35em',
  }),
  sound: css({
    position: 'absolute',
    right: '0.6cqw',
    bottom: '0.6cqw',
    padding: '0.3cqw 0.6cqw',
    border: '0.1cqw solid token(colors.signage.paper)',
    background: 'rgb(9 9 9 / 80%)',
    color: 'signage.paper',
    fontSize: '0.62cqw',
    cursor: 'pointer',
  }),
  offline: css({
    position: 'absolute',
    top: '0.6cqw',
    right: '0.6cqw',
    padding: '0.25cqw 0.45cqw',
    border: '0.1cqw solid token(colors.signage.bad)',
    background: 'signage.panel',
    color: 'signage.bad',
    fontSize: '0.62cqw',
  }),
  footer: css({
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: '0.8cqw',
    minWidth: 0,
    paddingLeft: 'var(--gutter)',
    overflow: 'hidden',
    borderTop: '0.22cqw solid token(colors.signage.paper)',
    background: 'signage.paper',
    color: 'signage.ink',
  }),
  footerLabel: css({
    flexShrink: 0,
    padding: '0.2cqw 0.6cqw',
    background: 'signage.ink',
    color: 'signage.paper',
    fontSize: '0.7cqw',
    letterSpacing: '0.3em',
  }),
  ticker: cva({
    base: {
      display: 'flex',
      flex: 1,
      alignItems: 'center',
      alignSelf: 'stretch',
      minWidth: 0,
      overflow: 'hidden',
    },
    variants: {
      alerting: {
        true: { background: 'signage.ink', color: 'signage.paper' },
        false: {},
      },
    },
  }),
  tickerContent: css({
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: '1.1cqw',
    paddingLeft: '100%',
    animation: 'ticker 26s linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animationDuration: '78s' },
    '& strong': {
      fontSize: '1.18cqw',
      fontWeight: 'inherit',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    },
  }),
  alertTag: css({
    padding: '0.25cqw 0.6cqw',
    background: 'signage.bad',
    color: 'signage.ink',
    fontSize: '0.85cqw',
    letterSpacing: '0.12em',
  }),
}
</script>

<template>
  <div :class="styles.shell">
    <div :class="styles.frame">
      <section :class="styles.statusPanel">
        <header :class="styles.panelHeading">
          <div>
            <p :class="styles.eyebrow">LIVE STATUS</p>
            <h1 :class="styles.title">販売・混雑状況</h1>
          </div>
          <span v-if="pageCount > 1" :class="styles.pageCount">{{ page + 1 }}/{{ pageCount }}</span>
        </header>

        <div :class="styles.list" :style="{ '--rows': rows }">
          <article v-for="row in visibleRows" :key="row.orgId" :class="styles.row">
            <strong :class="styles.orgName">{{ classOrgLabel(row.orgId) }}</strong>
            <template v-if="row.status">
              <span :class="signageBadge({ tone: SIGNAGE_SALES_TONES[row.status.sales] })">
                {{ SIGNAGE_SALES_LABELS[row.status.sales] }}
              </span>
              <span
                v-if="!hidesCongestion(row.status.sales) && row.status.congestion"
                :class="signageBadge({ tone: SIGNAGE_CONGESTION_TONES[row.status.congestion] })"
              >
                {{ CONGESTION_LABELS[row.status.congestion] }}
              </span>
              <span v-else :class="signageBadge({ tone: 'muted' })">—</span>
            </template>
            <span v-else :class="styles.unreported">未報告</span>
          </article>
        </div>
      </section>

      <section :class="styles.videoPanel">
        <video
          v-if="showsVideo"
          ref="video"
          :src="videoUrl!"
          :muted="!soundEnabled"
          autoplay
          loop
          playsinline
          @error="videoFailed = true"
        />
        <div v-else :class="styles.fallback">
          <span :class="styles.fallbackTitle">映像準備中</span>
          <small :class="styles.fallbackNote">VIDEO STANDBY</small>
        </div>
        <audio v-if="playsAudio" ref="audio" :src="audioUrl!" autoplay />
        <button v-if="needsSound" type="button" :class="styles.sound" @click="enableSound">
          音声を有効にする
        </button>
        <span v-if="!connected" :class="styles.offline">通信を確認しています。</span>
      </section>

      <footer :class="styles.footer">
        <span :class="styles.footerLabel">INFORMATION</span>
        <div :class="styles.ticker({ alerting })">
          <p :key="footer" :class="styles.tickerContent">
            <span v-if="alerting" :class="styles.alertTag">速報</span>
            <strong>{{ footer }}</strong>
          </p>
        </div>
      </footer>
    </div>
  </div>
</template>
