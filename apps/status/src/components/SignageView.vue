<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { STATUS_ORG_IDS } from '@shared/status'
import type { SignagePayload } from '@shared/status'
import { clockOffset } from '@/lib/signageTimetable'
import SignageCanvas from '@/components/SignageCanvas.vue'
import { css } from '@styled/css'

const REFRESH_MS = 60_000

const offset = clockOffset(window.location.search)
const payload = ref<SignagePayload | null>(null)
const failures = ref(0)
const unauthorized = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

function mediaUrl(kind: 'video' | 'audio', key: string | null | undefined): string | null {
  return key ? `/api/signage/${kind}/${encodeURIComponent(key)}` : null
}

const videoUrl = computed(() => mediaUrl('video', payload.value?.config.activeVideoKey))
const audioUrl = computed(() => mediaUrl('audio', payload.value?.config.activeAudioKey))

async function refresh() {
  try {
    const response = await fetch('/api/signage', { cache: 'no-store' })
    if (response.status === 401) {
      unauthorized.value = true
      return
    }
    if (!response.ok) throw new Error(`signage: ${response.status}`)
    payload.value = (await response.json()) as SignagePayload
    failures.value = 0
    unauthorized.value = false
  } catch {
    failures.value += 1
  }
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
    :video-url="videoUrl"
    :audio-url="audioUrl"
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
