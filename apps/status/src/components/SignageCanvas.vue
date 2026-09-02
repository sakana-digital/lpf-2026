<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { hidesCongestion } from '@shared/status'
import type { OrgStatus, SignageConfig } from '@shared/status'
import { classOrgLabel } from '@/lib/orgLabel'
import { footerMessages } from '@/lib/signageSchedule'
import { CONGESTION_LABELS, SIGNAGE_SALES_LABELS } from '@/lib/statusLabel'

const props = withDefaults(
  defineProps<{
    config: SignageConfig
    statuses: OrgStatus[]
    videoUrl?: string | null
    connected?: boolean
    preview?: boolean
    clockOffset?: number
  }>(),
  { videoUrl: null, connected: true, preview: false, clockOffset: 0 },
)

const MIN_ROWS = 8
const MAX_ROWS = 12
const ROTATE_MS = 10_000
const tick = ref(0)
const now = ref(new Date(Date.now() + props.clockOffset))
const videoFailed = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const pageCount = computed(() => Math.max(1, Math.ceil(props.config.orgIds.length / MAX_ROWS)))
const page = computed(() => tick.value % pageCount.value)
// Spread organizations evenly so the last page is never nearly empty.
const rows = computed(() =>
  Math.max(MIN_ROWS, Math.ceil(props.config.orgIds.length / pageCount.value)),
)
const visibleOrgIds = computed(() => {
  const start = page.value * rows.value
  return props.config.orgIds.slice(start, start + rows.value)
})
const statusMap = computed(() => new Map(props.statuses.map((status) => [status.orgId, status])))

// The alert wins over the timetable, which in turn wins over the fixed notice.
const alerting = computed(() => props.config.alertEnabled && props.config.alertText !== '')
const footer = computed(() => {
  if (alerting.value) return props.config.alertText
  const messages = footerMessages(now.value)
  if (messages.length === 0) return props.config.footerText
  return messages[tick.value % messages.length]!
})

watch(
  () => props.config.orgIds.join('\0'),
  () => {
    tick.value = 0
  },
)

watch(
  () => props.videoUrl,
  () => {
    videoFailed.value = false
  },
)

onMounted(() => {
  timer = setInterval(() => {
    tick.value += 1
    now.value = new Date(Date.now() + props.clockOffset)
  }, ROTATE_MS)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="signage-shell" :class="{ preview }">
    <div class="signage-frame">
      <section class="status-panel">
        <header class="panel-heading">
          <div>
            <p class="eyebrow">LIVE STATUS</p>
            <h1>販売・混雑状況</h1>
          </div>
          <span v-if="pageCount > 1" class="page-count">{{ page + 1 }}/{{ pageCount }}</span>
        </header>

        <div class="status-list" :style="{ '--rows': rows }">
          <article v-for="orgId in visibleOrgIds" :key="orgId" class="status-row">
            <strong class="org-name">{{ classOrgLabel(orgId) }}</strong>
            <template v-if="statusMap.get(orgId)">
              <span class="badge sales" :class="`level-${statusMap.get(orgId)!.sales}`">
                {{ SIGNAGE_SALES_LABELS[statusMap.get(orgId)!.sales] }}
              </span>
              <span
                v-if="
                  !hidesCongestion(statusMap.get(orgId)!.sales) && statusMap.get(orgId)!.congestion
                "
                class="badge congestion"
                :class="`level-${statusMap.get(orgId)!.congestion}`"
              >
                {{ CONGESTION_LABELS[statusMap.get(orgId)!.congestion!] }}
              </span>
              <span v-else class="badge congestion muted">—</span>
            </template>
            <span v-else class="unreported">未報告</span>
          </article>
        </div>
      </section>

      <section class="video-panel">
        <video
          v-if="videoUrl && !videoFailed"
          :src="videoUrl"
          autoplay
          muted
          loop
          playsinline
          @error="videoFailed = true"
        />
        <div v-else class="video-fallback">
          <span>映像準備中</span>
          <small>VIDEO STANDBY</small>
        </div>
        <span v-if="!connected" class="offline">通信を確認しています</span>
      </section>

      <footer class="signage-footer" :class="{ alerting }">
        <span class="label">INFORMATION</span>
        <div class="ticker">
          <p :key="footer" class="ticker-content">
            <span v-if="alerting" class="alert">速報</span><strong>{{ footer }}</strong>
          </p>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.signage-shell {
  container-type: size;
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #050505;
  color: #f7f7f2;
  font-family: 'futura-pt', 'Futura', 'Noto Sans JP', sans-serif;
  font-weight: var(--weight-bold);

  &.preview {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
}

.signage-frame {
  --gutter: 1.1cqw;

  display: grid;
  grid-template-columns: 45fr 55fr;
  grid-template-rows: minmax(0, 1fr) 8.9%;
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  border: 0.2cqw solid #f7f7f2;

  .preview & {
    width: 100%;
    height: 100%;
  }
}

.status-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  overflow: hidden;
  border-right: 0.22cqw solid #f7f7f2;
  background:
    linear-gradient(90deg, transparent 49%, rgb(255 255 255 / 4%) 50%, transparent 51%),
    radial-gradient(circle, rgb(255 255 255 / 16%) 0 0.07cqw, transparent 0.08cqw) 0 0 / 0.5cqw
      0.5cqw,
    #090909;
}

.panel-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  padding: 1.55cqw var(--gutter) 1.1cqw;
  border-bottom: 0.17cqw solid #f7f7f2;
  background: #f7f7f2;
  color: #080808;

  .eyebrow {
    font-size: 0.62cqw;
    letter-spacing: 0.24em;
    line-height: 1;
  }

  h1 {
    margin-top: 0.25cqw;
    font-size: 1.42cqw;
    font-weight: var(--weight-black);
    letter-spacing: 0.04em;
    line-height: 1;
  }
}

.page-count {
  padding: 0.2cqw 0.45cqw;
  border: 0.1cqw solid #080808;
  font-size: 0.68cqw;
  font-variant-numeric: tabular-nums;
}

.status-list {
  display: grid;
  grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
}

.status-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8.6cqw 8.6cqw;
  align-items: center;
  gap: 0.55cqw;
  min-height: 0;
  padding: 0.2cqw var(--gutter);
  border-bottom: 0.08cqw solid rgb(255 255 255 / 50%);

  &:nth-child(even) {
    background: repeating-linear-gradient(
      -45deg,
      rgb(255 255 255 / 7%) 0 0.08cqw,
      transparent 0.08cqw 0.35cqw
    );
  }
}

.org-name {
  display: flex;
  align-items: center;
  gap: 0.6cqw;
  font-size: 1.3cqw;
  font-weight: var(--weight-black);
  letter-spacing: 0.03em;
  white-space: nowrap;

  &::after {
    content: '';
    flex: 1;
    height: 0.09cqw;
    background: repeating-linear-gradient(
      90deg,
      rgb(255 255 255 / 45%) 0 0.09cqw,
      transparent 0.09cqw 0.36cqw
    );
  }
}

.badge,
.unreported {
  display: grid;
  place-items: center;
  min-height: 1.75cqw;
  padding: 0.14cqw 0.3cqw;
  border: 0.1cqw solid currentColor;
  font-size: 0.8cqw;
  line-height: 1.15;
  text-align: center;
}

.unreported {
  grid-column: 2 / 4;
  color: #999;
  background: #151515;
  letter-spacing: 0.14em;
}

.level-available,
.level-low:not(.sales) {
  color: #68e49b;
  background: rgb(35 118 69 / 32%);
}

.level-partial,
.level-medium {
  color: #ffe06b;
  background: rgb(136 109 15 / 32%);
}

.level-low.sales,
.level-high,
.level-soldout {
  color: #ff6f75;
  background: rgb(135 27 36 / 38%);
}

.level-paused {
  color: #ffae67;
  background: rgb(139 72 15 / 36%);
}

.muted {
  color: #777;
  background: #111;
}

.video-panel {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #000;

  video {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.video-fallback {
  display: grid;
  align-content: center;
  justify-items: center;
  background:
    radial-gradient(circle, #777 0 0.09cqw, transparent 0.1cqw) 0 0 / 0.55cqw 0.55cqw,
    #171717;

  span {
    padding: 0.45cqw 1cqw;
    background: #f7f7f2;
    color: #050505;
    font-size: 2.2cqw;
    letter-spacing: 0.18em;
  }

  small {
    margin-top: 0.6cqw;
    padding: 0.1cqw 0.4cqw;
    background: #050505;
    font-size: 0.72cqw;
    letter-spacing: 0.35em;
  }
}

.offline {
  position: absolute;
  top: 0.6cqw;
  right: 0.6cqw;
  padding: 0.25cqw 0.45cqw;
  border: 0.1cqw solid #ff6f75;
  background: #090909;
  color: #ff6f75;
  font-size: 0.62cqw;
}

.signage-footer {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 0.8cqw;
  min-width: 0;
  padding-left: var(--gutter);
  overflow: hidden;
  border-top: 0.22cqw solid #f7f7f2;
  background: #f7f7f2;
  color: #050505;

  .label {
    flex-shrink: 0;
    padding: 0.2cqw 0.6cqw;
    background: #050505;
    color: #f7f7f2;
    font-size: 0.7cqw;
    letter-spacing: 0.3em;
  }

  &.alerting .ticker {
    background: #050505;
    color: #f7f7f2;
  }
}

.ticker {
  display: flex;
  flex: 1;
  align-items: center;
  align-self: stretch;
  min-width: 0;
  overflow: hidden;
}

.ticker-content {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1.1cqw;
  padding-left: 100%;
  animation: ticker 26s linear infinite;

  .alert {
    padding: 0.25cqw 0.6cqw;
    background: #ff6f75;
    color: #050505;
    font-size: 0.85cqw;
    letter-spacing: 0.12em;
  }

  strong {
    font-size: 1.18cqw;
    font-weight: inherit;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
}

@keyframes ticker {
  to {
    transform: translateX(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-content {
    animation-duration: 78s;
  }
}
</style>
