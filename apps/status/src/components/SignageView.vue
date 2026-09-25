<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { STATUS_ORG_IDS } from '@shared/status'
import type { SignagePayload } from '@shared/status'
import { readStored, writeStored } from '@shared/storage'
import { syncMediaCache } from '@/lib/signageOffline'
import { clockOffset } from '@/lib/signageTimetable'
import SignageCanvas from '@/components/SignageCanvas.vue'
import { css } from '@styled/css'

const REFRESH_MS = 60_000
// What the display showed last, so a reload while offline is not left blank.
const PAYLOAD_KEY = 'signage-payload'

const offset = clockOffset(window.location.search)
const payload = ref<SignagePayload | null>(null)
const failures = ref(0)
const unauthorized = ref(false)
const playable = ref<string[]>([])
const downloads = reactive(new Map<string, { loaded: number; total: number }>())
let timer: ReturnType<typeof setInterval> | undefined
let mediaSyncs = 0

function mediaUrl(kind: 'video' | 'audio', key: string | null | undefined): string | null {
  return key ? `/api/signage/${kind}/${encodeURIComponent(key)}` : null
}

const videoUrl = computed(() => mediaUrl('video', payload.value?.config.activeVideoKey))
const audioUrl = computed(() => mediaUrl('audio', payload.value?.config.activeAudioKey))
const videoDownload = computed(() => (videoUrl.value && downloads.get(videoUrl.value)) || null)

function playableUrl(url: string | null): string | null {
  return url !== null && playable.value.includes(url) ? url : null
}

// Only the latest sync decides, or a slow download of an old file could hide the new one.
async function syncMedia() {
  const run = ++mediaSyncs
  const paths = [videoUrl.value, audioUrl.value].filter((url) => url !== null)
  const ready = await syncMediaCache(paths, (path, loaded, total) => {
    downloads.set(path, { loaded, total })
  })
  for (const path of paths) downloads.delete(path)
  if (run === mediaSyncs) playable.value = ready
}

async function refresh() {
  try {
    const response = await fetch('/api/signage', { cache: 'no-store' })
    if (response.status === 401) {
      unauthorized.value = true
      return
    }
    if (!response.ok) throw new Error(`signage: ${response.status}`)
    const text = await response.text()
    payload.value = JSON.parse(text) as SignagePayload
    failures.value = 0
    unauthorized.value = false
    writeStored(PAYLOAD_KEY, text)
  } catch {
    failures.value += 1
    payload.value ??= JSON.parse(readStored(PAYLOAD_KEY) ?? 'null') as SignagePayload | null
  }
  if (payload.value) void syncMedia()
}

onMounted(() => {
  void refresh()
  timer = setInterval(refresh, REFRESH_MS)
})

onUnmounted(() => clearInterval(timer))

const styles = {
  shell: css({
    display: 'grid',
    placeItems: 'center',
    width: '100vw',
    height: '100vh',
    background:
      'radial-gradient(circle, #555 0 2px, transparent 2px) 0 0 / 12px 12px, token(colors.signage.standby)',
    color: 'signage.paper',
    textAlign: 'center',
  }),
  box: css({
    padding: '24px 32px',
    border: '4px solid token(colors.signage.paper)',
    background: 'signage.panel',
  }),
  title: css({
    fontSize: 'clamp(24px, 3vw, 54px)',
    fontWeight: 'black',
    letterSpacing: '0.12em',
  }),
  note: css({ fontSize: 'clamp(12px, 1vw, 20px)', letterSpacing: '0.08em' }),
}
</script>

<template>
  <SignageCanvas
    v-if="payload"
    :config="payload.config"
    :org-ids="STATUS_ORG_IDS"
    :statuses="payload.statuses"
    :video-url="playableUrl(videoUrl)"
    :audio-url="playableUrl(audioUrl)"
    :video-download="videoDownload"
    :connected="failures < 2"
    :clock-offset="offset"
  />
  <main v-else :class="styles.shell">
    <div :class="styles.box">
      <p :class="styles.title">
        {{ unauthorized ? '閲覧 URL が無効です。' : 'SIGNAGE INITIALIZING' }}
      </p>
      <small :class="styles.note">{{
        unauthorized ? '管理者から発行された URL を開いてください。' : '接続しています。'
      }}</small>
    </div>
  </main>
</template>
