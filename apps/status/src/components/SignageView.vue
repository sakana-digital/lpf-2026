<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { SignagePayload } from '../../../../shared/status'
import SignageCanvas from '@/components/SignageCanvas.vue'

const payload = ref<SignagePayload | null>(null)
const failures = ref(0)
const unauthorized = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const videoUrl = computed(() => {
  const key = payload.value?.config.activeVideoKey
  return key ? `/api/signage/video/${encodeURIComponent(key)}` : null
})

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
  timer = setInterval(refresh, 10_000)
})

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <SignageCanvas
    v-if="payload"
    :config="payload.config"
    :statuses="payload.statuses"
    :video-url="videoUrl"
    :connected="failures < 2"
  />
  <main v-else class="signage-loading">
    <div>
      <p>{{ unauthorized ? '閲覧 URL が無効です' : 'SIGNAGE INITIALIZING' }}</p>
      <small>{{
        unauthorized ? '管理者から発行された URL を開いてください' : '接続しています'
      }}</small>
    </div>
  </main>
</template>

<style scoped>
.signage-loading {
  display: grid;
  place-items: center;
  width: 100vw;
  height: 100vh;
  background:
    radial-gradient(circle, #555 0 2px, transparent 2px) 0 0 / 12px 12px,
    #111;
  color: #fff;
  text-align: center;

  div {
    padding: 24px 32px;
    border: 4px solid #fff;
    background: #080808;
  }

  p {
    font-size: clamp(24px, 3vw, 54px);
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  small {
    font-size: clamp(12px, 1vw, 20px);
    letter-spacing: 0.08em;
  }
}
</style>
