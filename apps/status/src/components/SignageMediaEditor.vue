<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { css, cx } from '@styled/css'
import { blockHeading, button, control, hint, resultBadge } from '@styled/recipes'
import type {
  SignageMedia,
  SignageMediaKind,
  SignageUploadedPart,
  SignageUploadStartResponse,
} from '@shared/status'
import {
  abortSignageUpload,
  completeSignageUpload,
  deleteSignageMedia,
  getSignageMedia,
  startSignageUpload,
  uploadSignagePart,
} from '@/lib/api'

const props = defineProps<{ token: string; kind: SignageMediaKind }>()
const activeKey = defineModel<string | null>('activeKey', { required: true })
const startAt = defineModel<string>('startAt', { required: true })

interface KindText {
  heading: string
  upload: string
  limit: string
  start: string
  clear: string
  none: string
  accept: string
}

const TEXT: Record<SignageMediaKind, KindText> = {
  video: {
    heading: '動画',
    upload: 'MP4 を選ぶ',
    limit: '最大 1 GiB',
    start: '再生を始める時刻',
    clear: 'すぐ再生',
    none: '動画を表示しない',
    accept: 'video/mp4,.mp4',
  },
  audio: {
    heading: '音声',
    upload: 'MP3・M4A を選ぶ',
    limit: '最大 64 MiB',
    start: '再生する時刻',
    clear: '再生しない',
    none: '音声を再生しない',
    accept: 'audio/mpeg,audio/mp4,.mp3,.m4a',
  },
}

const text = TEXT[props.kind]
const media = ref<SignageMedia[]>([])
const uploadProgress = ref<number | null>(null)
const error = ref('')
const activeUpload = ref<SignageUploadStartResponse | null>(null)
let uploadController: AbortController | null = null

async function refresh() {
  try {
    media.value = await getSignageMedia(props.token, props.kind)
  } catch {
    error.value = `${text.heading}の一覧を取得できませんでした。`
  }
}

async function retryPart(
  upload: SignageUploadStartResponse,
  partNumber: number,
  chunk: Blob,
): Promise<SignageUploadedPart> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await uploadSignagePart(
        props.token,
        upload,
        partNumber,
        chunk,
        uploadController?.signal,
      )
    } catch (failure) {
      lastError = failure
      if (uploadController?.signal.aborted) throw failure
    }
  }
  throw lastError
}

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || activeUpload.value) return
  error.value = ''
  uploadProgress.value = 0
  uploadController = new AbortController()
  try {
    const upload = await startSignageUpload(props.token, file)
    activeUpload.value = upload
    const partCount = Math.ceil(file.size / upload.partSize)
    const parts: SignageUploadedPart[] = []
    for (let index = 0; index < partCount; index += 1) {
      const start = index * upload.partSize
      const chunk = file.slice(start, Math.min(start + upload.partSize, file.size), file.type)
      parts.push(await retryPart(upload, index + 1, chunk))
      uploadProgress.value = Math.round(((index + 1) / partCount) * 100)
    }
    await completeSignageUpload(props.token, upload, parts)
    await refresh()
  } catch {
    if (activeUpload.value) {
      try {
        await abortSignageUpload(props.token, activeUpload.value)
      } catch {
        // R2 also expires incomplete multipart uploads automatically.
      }
    }
    error.value = uploadController.signal.aborted
      ? 'アップロードを中止しました。'
      : `${text.heading}のアップロードに失敗しました。`
  } finally {
    activeUpload.value = null
    uploadController = null
    uploadProgress.value = null
  }
}

function cancelUpload() {
  uploadController?.abort()
}

async function remove(item: SignageMedia) {
  if (item.key === activeKey.value) return
  try {
    await deleteSignageMedia(props.token, props.kind, item.key)
    media.value = media.value.filter((other) => other.key !== item.key)
  } catch {
    error.value = `${text.heading}を削除できませんでした。`
  }
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onMounted(refresh)
onUnmounted(cancelUpload)

const styles = {
  uploadRow: css({ display: 'flex', alignItems: 'center', gap: '10px' }),
  upload: cx(
    button({ variant: 'primary' }),
    css({
      '& input': { display: 'none' },
      '&[data-disabled]': { opacity: 0.4, cursor: 'not-allowed' },
    }),
  ),
  progress: css({
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    minHeight: '40px',
    marginTop: '8px',
    overflow: 'hidden',
    border: '1px solid token(colors.border)',
  }),
  progressBar: css({ position: 'absolute', inset: '0 auto 0 0', background: 'surfaceSoft' }),
  progressLabel: css({ position: 'relative', zIndex: 1, padding: '8px 12px', fontSize: '12px' }),
  progressCancel: css({
    position: 'relative',
    zIndex: 1,
    padding: '8px 12px',
    borderLeft: '1px solid token(colors.border)',
    fontSize: '12px',
    cursor: 'pointer',
  }),
  error: css({ marginTop: '8px' }),
  start: css({ display: 'flex', alignItems: 'end', gap: '8px', marginTop: '12px' }),
  startField: css({ display: 'grid', flex: 1, gap: '5px' }),
  list: css({ display: 'grid', gap: '5px', marginTop: '10px' }),
  item: css({
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: '9px',
    padding: '6px 6px 6px 10px',
    border: '1px solid token(colors.border)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background token(durations.base) ease',
    _hover: { background: 'surfaceSoft' },
  }),
  itemName: css({
    display: 'grid',
    minWidth: 0,
    '& strong': { truncate: true },
    '& small': { color: 'textMute' },
  }),
}
</script>

<template>
  <section>
    <h2 :class="blockHeading()">{{ text.heading }}</h2>
    <div :class="styles.uploadRow">
      <label :class="styles.upload" :data-disabled="activeUpload ? '' : undefined">
        {{ text.upload }}
        <input
          type="file"
          :accept="text.accept"
          :disabled="Boolean(activeUpload)"
          @change="uploadFile"
        />
      </label>
      <span :class="hint()">{{ text.limit }}</span>
    </div>
    <div v-if="uploadProgress !== null" :class="styles.progress">
      <div :class="styles.progressBar" :style="{ width: `${uploadProgress}%` }" />
      <span :class="styles.progressLabel">{{ uploadProgress }}%</span>
      <button type="button" :class="styles.progressCancel" @click="cancelUpload">中止</button>
    </div>
    <p v-if="error" :class="cx(resultBadge({ tone: 'error' }), styles.error)">{{ error }}</p>
    <div :class="styles.start">
      <label :class="cx(hint(), styles.startField)">
        <span>{{ text.start }}</span>
        <input v-model="startAt" :class="control()" type="datetime-local" />
      </label>
      <button type="button" :class="button()" :disabled="!startAt" @click="startAt = ''">
        {{ text.clear }}
      </button>
    </div>
    <div :class="styles.list">
      <label :class="styles.item">
        <input v-model="activeKey" type="radio" :value="null" />
        <span>{{ text.none }}</span>
      </label>
      <label v-for="item in media" :key="item.key" :class="styles.item">
        <input v-model="activeKey" type="radio" :value="item.key" />
        <span :class="styles.itemName">
          <strong>{{ item.name }}</strong>
          <small>{{ formatSize(item.size) }}</small>
        </span>
        <button
          type="button"
          :class="button({ variant: 'ghost', size: 'sm' })"
          :disabled="item.key === activeKey"
          @click.prevent="remove(item)"
        >
          削除
        </button>
      </label>
    </div>
  </section>
</template>
