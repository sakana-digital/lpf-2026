<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { hidesCongestion } from '@shared/status'
import type { OrgStatus, SignageConfig } from '@shared/status'
import { readStored, writeStored } from '@shared/storage'
import { festivalNow, jstDate, jstTime } from '@shared/timetable'
import { classOrgLabel, orgProjectLabel } from '@/lib/orgLabel'
import { SIGNAGE_LINKS } from '@/lib/signageLinks'
import { vFitText } from '@/lib/fitText'
import { vTickerSpan } from '@/lib/tickerSpan'
import { footerMessages } from '@/lib/signageTimetable'
import { CONGESTION_LABELS, SIGNAGE_SALES_LABELS } from '@/lib/statusLabel'
import { signageBadge } from '@/styles/signage'
import { CONGESTION_TONES, SALES_TONES } from '@/styles/status'
import { useNow } from '@/composables/useNow'
import SignageClock from '@/components/SignageClock.vue'
import { css, cva, cx } from '@styled/css'

const props = withDefaults(
  defineProps<{
    config: SignageConfig
    orgIds: readonly string[]
    statuses: OrgStatus[]
    videoUrl?: string | null
    audioUrl?: string | null
    videoDownload?: { loaded: number; total: number } | null
    connected?: boolean
    clockOffset?: number
  }>(),
  { videoUrl: null, audioUrl: null, videoDownload: null, connected: true, clockOffset: 0 },
)

const MIN_ROWS = 8
const MAX_ROWS = 12
const ROTATE_MS = 10_000
const SOUND_KEY = 'signage-sound'
const tick = ref(0)
const now = useNow(() => props.clockOffset)
const videoFailed = ref(false)
// The stored choice outlives a refused autoplay: after a reload the browser
// may keep the video muted until someone touches the page, and that must not
// be mistaken for the operator turning sound off.
const soundWanted = ref(readStored(SOUND_KEY) === 'on')
const soundEnabled = ref(soundWanted.value)
const video = useTemplateRef<HTMLVideoElement>('video')
const audio = useTemplateRef<HTMLAudioElement>('audio')
let rotateTimer: ReturnType<typeof setInterval> | undefined

const festivalDay = computed(() => festivalNow(now.value)?.day ?? null)
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
  visibleOrgIds.value.map((orgId) => ({
    orgId,
    label: classOrgLabel(orgId),
    project: orgProjectLabel(orgId),
    status: statusMap.value.get(orgId) ?? null,
  })),
)

// The alert wins over the timetable, which in turn wins over the fixed notice.
const alerting = computed(() => props.config.alertEnabled && props.config.alertText !== '')

// The timetable is only read again between scroll passes: its wording shifts
// every minute and would otherwise cut the line off mid-way.
const footerAt = ref(now.value)
const footer = computed(() => {
  if (alerting.value) return [props.config.alertText]
  const messages = footerMessages(footerAt.value)
  return messages.length > 0 ? messages : [props.config.footerText]
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

// Without the start time, a scheduled video looks the same as a broken one.
const videoStartLabel = computed(() => {
  const startAt = props.config.videoStartAt
  if (props.config.activeVideoKey === null || startAt === null || videoReady.value) return ''
  const start = new Date(startAt * 1000)
  const [hour, minute] = jstTime(start)
  const day = jstDate(start)
  const date =
    day === jstDate(now.value) ? '' : `${Number(day.slice(5, 7))}/${Number(day.slice(8))} `
  return `${date}${hour}:${minute} から放映`
})

const downloadLabel = computed(() => {
  if (!props.videoDownload) return ''
  const { loaded, total } = props.videoDownload
  const mb = (bytes: number) => Math.round(bytes / 1024 ** 2)
  return `${Math.floor((loaded * 100) / total)}%（${mb(loaded)} / ${mb(total)} MB）`
})

// Unlike the video, silence is the default: the audio needs a time to play at.
const audioScheduled = computed(() => props.audioUrl !== null && props.config.audioStartAt !== null)
const playsAudio = computed(() => audioScheduled.value && due(props.config.audioStartAt))
const needsSound = computed(() => !soundEnabled.value && (showsVideo.value || audioScheduled.value))

watch(soundWanted, (on) => writeStored(SOUND_KEY, on ? 'on' : 'off'))

// A fresh payload means the server is reachable again, so a failed video gets another try.
watch([() => props.videoUrl, () => props.config], () => {
  videoFailed.value = false
})

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
  if (played.includes(false)) {
    soundEnabled.value = false
    return
  }
  soundWanted.value = true
}

// Any touch counts as the gesture the browser waits for, so a remembered
// choice comes back without having to find the button.
function resumeSound() {
  if (soundWanted.value && !soundEnabled.value) void enableSound()
}

// Without a tap on this page the browser may refuse the remembered sound. Fall
// back to muted so the video still runs and the button comes back.
watch(
  [video, audio],
  async ([videoEl, audioEl]) => {
    if (!soundEnabled.value) return
    const played = await Promise.all([play(videoEl), play(audioEl)])
    if (!played.includes(false)) return
    soundEnabled.value = false
    await nextTick()
    void play(video.value)
  },
  { flush: 'post' },
)

onMounted(() => {
  window.addEventListener('pointerdown', resumeSound)
  rotateTimer = setInterval(() => {
    tick.value += 1
  }, ROTATE_MS)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', resumeSound)
  clearInterval(rotateTimer)
})

const column = css({
  display: 'grid',
  gridTemplateRows: 'var(--heading) minmax(0, 1fr)',
  minWidth: 0,
})
const band = css({
  display: 'flex',
  alignItems: 'center',
  padding: '0 var(--gutter)',
  borderBottom: 'var(--rule)',
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
    fontFamily: 'signage',
    fontWeight: 'bold',
  }),
  frame: css({
    '--gutter': '1.1cqw',
    '--heading': '5.2cqw',
    '--rule': '0.1cqw solid token(colors.signage.ink/35)',
    containerType: 'size',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: 'minmax(0, 1fr) 8.9%',
    width: 'min(100vw, calc(100vh * 16 / 9))',
    height: 'min(100vh, calc(100vw * 9 / 16))',
    padding: 'min(0.2cqw, calc(0.2cqh * 16 / 9))',
    background: 'signage.paper',
    color: 'signage.ink',
  }),
  statusPanel: cx(column, css({ overflow: 'hidden', borderRight: 'var(--rule)' })),
  panelHeading: cx(band, css({ justifyContent: 'space-between' })),
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
    gridTemplateColumns: 'minmax(0, 1fr) 9.4cqw 9.4cqw',
    alignItems: 'center',
    gap: '0.55cqw',
    minHeight: 0,
    padding: '0.2cqw var(--gutter)',
    borderBottom: '0.08cqw solid token(colors.signage.ink/25)',
  }),
  orgName: css({
    display: 'flex',
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: '0.6cqw',
    minWidth: 0,
    _after: {
      content: '""',
      flex: '1 0 1cqw',
      height: '0.09cqw',
      background:
        'repeating-linear-gradient(90deg, token(colors.signage.ink/45) 0 0.09cqw, transparent 0.09cqw 0.36cqw)',
    },
  }),
  orgText: css({
    minWidth: 0,
    overflow: 'hidden',
    fontSize: '1.7cqw',
    fontWeight: 'black',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
  }),
  project: css({
    marginLeft: '0.45em',
    fontSize: '0.8em',
    fontWeight: 'bold',
    letterSpacing: '0.02em',
  }),
  unreported: cx(
    signageBadge({ tone: 'muted' }),
    css({ gridColumn: '2 / 4', letterSpacing: '0.14em' }),
  ),
  mediaColumn: cx(column, css({ minHeight: 0 })),
  clockBand: cx(band, css({ justifyContent: 'end', gap: '1cqw' })),
  day: css({
    padding: '0.4cqw 0.9cqw',
    background: 'signage.ink',
    color: 'signage.paper',
    fontSize: '1.6cqw',
    letterSpacing: '0.2em',
    lineHeight: 1,
  }),
  videoPanel: css({
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    background:
      'radial-gradient(circle, #777 0 0.09cqw, transparent 0.1cqw) 0 0 / 0.55cqw 0.55cqw, token(colors.signage.standby)',
    color: 'signage.paper',
  }),
  screen: css({
    position: 'relative',
    display: 'grid',
    aspectRatio: '16 / 9',
    minHeight: 0,
    overflow: 'hidden',
    '& video': { width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'top' },
    '& audio': { display: 'none' },
  }),
  fallback: css({
    display: 'grid',
    alignContent: 'center',
    justifyItems: 'center',
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
  startAt: css({
    marginTop: '1.2cqw',
    fontSize: '1.3cqw',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.12em',
  }),
  download: css({
    display: 'grid',
    justifyItems: 'center',
    gap: '0.5cqw',
    marginTop: '1.4cqw',
    fontSize: '0.9cqw',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.08em',
    '& progress': {
      width: '18cqw',
      height: '0.6cqw',
      border: '0.1cqw solid token(colors.signage.paper)',
      background: 'transparent',
      appearance: 'none',
      '&::-webkit-progress-bar': { background: 'transparent' },
      '&::-webkit-progress-value': { background: 'signage.paper' },
      '&::-moz-progress-bar': { background: 'signage.paper' },
    },
  }),
  links: css({
    containerType: 'size',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12cqh',
  }),
  link: css({
    display: 'grid',
    gap: '3cqh',
    width: '76cqh',
    '& p': {
      padding: '1.5cqh 0',
      background: 'signage.paper',
      color: 'signage.ink',
      fontSize: '6cqh',
      letterSpacing: '0.04em',
      lineHeight: 1.2,
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
    '& img': {
      width: '100%',
      aspectRatio: '1',
      padding: 'calc(100% * 3 / 33)',
      background: 'signage.paper',
      imageRendering: 'pixelated',
    },
  }),
  sound: css({
    position: 'absolute',
    left: '0.6cqw',
    bottom: '0.6cqw',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6cqw',
    padding: '0.8cqw 1.4cqw',
    border: '0.15cqw solid token(colors.signage.paper)',
    background: 'rgb(9 9 9 / 85%)',
    color: 'signage.paper',
    fontSize: '1.3cqw',
    letterSpacing: '0.08em',
    lineHeight: 1,
    cursor: 'pointer',
    '& svg': { flexShrink: 0, width: '2.2cqw', height: '2.2cqw' },
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
    borderTop: 'var(--rule)',
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
    '--span': '1.5',
    animation: 'ticker calc(var(--span) * 17s) linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animationDuration: 'calc(var(--span) * 51s)' },
    '& strong': {
      fontSize: '1.18cqw',
      fontWeight: 'inherit',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    },
    '& strong + strong': { marginLeft: '3cqw' },
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
            <strong :class="styles.orgName">
              <span v-fit-text :class="styles.orgText">
                {{ row.label }}
                <span v-if="row.project" :class="styles.project">{{ row.project }}</span>
              </span>
            </strong>
            <template v-if="row.status">
              <span :class="signageBadge({ tone: SALES_TONES[row.status.sales] })">
                {{ SIGNAGE_SALES_LABELS[row.status.sales] }}
              </span>
              <span
                v-if="!hidesCongestion(row.status.sales) && row.status.congestion"
                :class="signageBadge({ tone: CONGESTION_TONES[row.status.congestion] })"
              >
                {{ CONGESTION_LABELS[row.status.congestion] }}
              </span>
              <span v-else :class="signageBadge({ tone: 'muted' })">—</span>
            </template>
            <span v-else :class="styles.unreported">未報告</span>
          </article>
        </div>
      </section>

      <div :class="styles.mediaColumn">
        <header :class="styles.clockBand">
          <span v-if="festivalDay" :class="styles.day">DAY {{ festivalDay }}</span>
          <SignageClock :offset="clockOffset" />
        </header>
        <section :class="styles.videoPanel">
          <div :class="styles.screen">
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
              <p v-if="videoStartLabel" :class="styles.startAt">{{ videoStartLabel }}</p>
              <div v-if="videoDownload" :class="styles.download">
                <progress :value="videoDownload.loaded" :max="videoDownload.total" />
                <small>{{ downloadLabel }}</small>
              </div>
            </div>
            <audio v-if="playsAudio" ref="audio" :src="audioUrl!" autoplay />
            <button v-if="needsSound" type="button" :class="styles.sound" @click="enableSound">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M11 5 6 9H2v6h4l5 4V5Z" fill="currentColor" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M19 5a10 10 0 0 1 0 14" />
              </svg>
              音声を有効にする
            </button>
            <span v-if="!connected" :class="styles.offline">通信を確認しています。</span>
          </div>
          <div :class="styles.links">
            <figure v-for="link in SIGNAGE_LINKS" :key="link.label" :class="styles.link">
              <p>{{ link.label }}</p>
              <img :src="link.qr" alt="" />
            </figure>
          </div>
        </section>
      </div>

      <footer :class="styles.footer">
        <span :class="styles.footerLabel">INFORMATION</span>
        <div :class="styles.ticker({ alerting })">
          <p
            :key="footer.join('\0')"
            v-ticker-span
            :class="styles.tickerContent"
            @animationiteration="footerAt = now"
          >
            <span v-if="alerting" :class="styles.alertTag">速報</span>
            <strong v-for="(message, i) in footer" :key="i">{{ message }}</strong>
          </p>
        </div>
      </footer>
    </div>
  </div>
</template>
