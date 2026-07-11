<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { hidesCongestion } from '../../../../shared/status'
import type { OrgStatus, SignageConfig } from '../../../../shared/status'
import { classOrgParams } from '@/lib/orgLabel'

const props = withDefaults(
  defineProps<{
    config: SignageConfig
    statuses: OrgStatus[]
    videoUrl?: string | null
    connected?: boolean
    preview?: boolean
  }>(),
  { videoUrl: null, connected: true, preview: false },
)

const SALES_LABELS = {
  available: '販売中',
  paused: '販売休止',
  partial: '一部完売',
  low: '残りわずか',
  soldout: '全て完売',
} as const

const CONGESTION_LABELS = {
  low: '空いている',
  medium: 'やや混雑',
  high: '混雑',
} as const

const PAGE_SIZE = 8
const page = ref(0)
const videoFailed = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const pageCount = computed(() => Math.max(1, Math.ceil(props.config.orgIds.length / PAGE_SIZE)))
const visibleOrgIds = computed(() => {
  const start = page.value * PAGE_SIZE
  return props.config.orgIds.slice(start, start + PAGE_SIZE)
})
const statusMap = computed(() => new Map(props.statuses.map((status) => [status.orgId, status])))

function orgLabel(id: string) {
  const params = classOrgParams(id)
  return params ? `${params.grade}年${params.classNo}組` : id
}

watch(
  () => props.config.orgIds.join('\0'),
  () => {
    page.value = 0
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
    page.value = (page.value + 1) % pageCount.value
  }, 10_000)
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

        <div class="status-list">
          <article v-for="orgId in visibleOrgIds" :key="orgId" class="status-row">
            <strong class="org-name">{{ orgLabel(orgId) }}</strong>
            <template v-if="statusMap.get(orgId)">
              <span class="badge sales" :class="`level-${statusMap.get(orgId)!.sales}`">
                {{ SALES_LABELS[statusMap.get(orgId)!.sales] }}
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

      <footer class="signage-footer">
        <p class="footer-text">{{ config.footerText || 'INFORMATION' }}</p>
        <div v-if="config.alertEnabled && config.alertText" class="alert-track">
          <div class="alert-content">
            <span>速報</span><strong>{{ config.alertText }}</strong>
            <span aria-hidden="true">速報</span
            ><strong aria-hidden="true">{{ config.alertText }}</strong>
          </div>
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
  font-family: 'Arial Narrow', 'Noto Sans JP', sans-serif;

  &.preview {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
}

.signage-frame {
  display: grid;
  grid-template-columns: 38fr 62fr;
  grid-template-rows: minmax(0, 1fr) 8.9%;
  width: min(100vw, calc(100vh * 16 / 9));
  height: min(100vh, calc(100vw * 9 / 16));
  overflow: hidden;
  border: 0.2cqw solid #f7f7f2;
  background: #050505;

  .preview & {
    width: 100%;
    height: 100%;
  }
}

.status-panel {
  position: relative;
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
  height: 14%;
  padding: 1.1cqw 1.25cqw 0.8cqw;
  border-bottom: 0.17cqw solid #f7f7f2;
  background: #f7f7f2;
  color: #080808;

  .eyebrow {
    font-size: 0.62cqw;
    font-weight: 900;
    letter-spacing: 0.24em;
    line-height: 1;
  }

  h1 {
    margin-top: 0.25cqw;
    font-size: 1.42cqw;
    font-weight: 950;
    letter-spacing: 0.04em;
    line-height: 1;
  }
}

.page-count {
  padding: 0.2cqw 0.45cqw;
  border: 0.1cqw solid #080808;
  font-size: 0.68cqw;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.status-list {
  display: grid;
  grid-template-rows: repeat(8, 1fr);
  height: 86%;
}

.status-row {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.5cqw;
  min-height: 0;
  padding: 0.45cqw 0.7cqw;
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
  font-size: 1.18cqw;
  font-weight: 950;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.badge,
.unreported {
  display: grid;
  place-items: center;
  min-height: 2.05cqw;
  padding: 0.2cqw 0.25cqw;
  border: 0.1cqw solid currentColor;
  font-size: 0.72cqw;
  font-weight: 900;
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
  place-items: center;
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
  place-items: center;
  align-content: center;
  width: 100%;
  height: 100%;
  border: 0.6cqw solid #f7f7f2;
  background:
    radial-gradient(circle, #777 0 0.09cqw, transparent 0.1cqw) 0 0 / 0.55cqw 0.55cqw,
    #171717;
  box-shadow: inset 0 0 0 0.35cqw #050505;

  span {
    padding: 0.45cqw 1cqw;
    background: #f7f7f2;
    color: #050505;
    font-size: 2.2cqw;
    font-weight: 950;
    letter-spacing: 0.18em;
  }

  small {
    margin-top: 0.6cqw;
    padding: 0.1cqw 0.4cqw;
    background: #050505;
    font-size: 0.72cqw;
    font-weight: 900;
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
  font-weight: 900;
}

.signage-footer {
  position: relative;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  border-top: 0.22cqw solid #f7f7f2;
  background: #f7f7f2;
  color: #050505;
}

.footer-text {
  width: 100%;
  padding: 0 1.15cqw;
  overflow: hidden;
  font-size: 1.18cqw;
  font-weight: 950;
  letter-spacing: 0.05em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alert-track {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: #050505;
  color: #f7f7f2;
}

.alert-content {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 1.1cqw;
  min-width: max-content;
  animation: ticker 20s linear infinite;

  span {
    padding: 0.25cqw 0.6cqw;
    background: #ff6f75;
    color: #050505;
    font-size: 0.85cqw;
    font-weight: 950;
    letter-spacing: 0.12em;
  }

  strong {
    min-width: 100cqw;
    font-size: 1.15cqw;
    letter-spacing: 0.08em;
  }
}

@keyframes ticker {
  from {
    transform: translateX(100cqw);
  }
  to {
    transform: translateX(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alert-content {
    animation-duration: 60s;
  }
}
</style>
