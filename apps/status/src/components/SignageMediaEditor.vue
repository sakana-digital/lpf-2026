<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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
  start: string
  clear: string
  none: string
  accept: string
}

const TEXT: Record<SignageMediaKind, KindText> = {
  video: {
    heading: '動画',
    upload: 'MP4 をアップロード（最大 1 GiB）',
    start: '再生を始める時刻',
    clear: 'すぐ再生',
    none: '動画を表示しない',
    accept: 'video/mp4,.mp4',
  },
  audio: {
    heading: '音声',
    upload: 'MP3・M4A をアップロード（最大 64 MiB）',
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
    error.value = `${text.heading}の一覧を取得できませんでした`
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
      ? 'アップロードを中止しました'
      : `${text.heading}のアップロードに失敗しました`
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
    error.value = `${text.heading}を削除できませんでした`
  }
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onMounted(refresh)
onUnmounted(cancelUpload)
</script>

<template>
  <section class="block">
    <h2 class="block-heading">{{ text.heading }}</h2>
    <label class="upload-button" :class="{ disabled: activeUpload }">
      {{ text.upload }}
      <input
        type="file"
        :accept="text.accept"
        :disabled="Boolean(activeUpload)"
        @change="uploadFile"
      />
    </label>
    <div v-if="uploadProgress !== null" class="upload-progress">
      <div :style="{ width: `${uploadProgress}%` }" />
      <span>{{ uploadProgress }}%</span>
      <button type="button" @click="cancelUpload">中止</button>
    </div>
    <p v-if="error" class="result error">{{ error }}</p>
    <div class="media-start">
      <label class="field">
        <span>{{ text.start }}</span>
        <input v-model="startAt" type="datetime-local" />
      </label>
      <button type="button" :disabled="!startAt" @click="startAt = ''">{{ text.clear }}</button>
    </div>
    <div class="media-list">
      <label class="media-item none">
        <input v-model="activeKey" type="radio" :value="null" />
        <span>{{ text.none }}</span>
      </label>
      <label v-for="item in media" :key="item.key" class="media-item">
        <input v-model="activeKey" type="radio" :value="item.key" />
        <span
          ><strong>{{ item.name }}</strong
          ><small>{{ formatSize(item.size) }}</small></span
        >
        <button type="button" :disabled="item.key === activeKey" @click.prevent="remove(item)">
          削除
        </button>
      </label>
    </div>
  </section>
</template>

<style scoped>
.block {
  padding: 20px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.block-heading {
  margin-bottom: 16px;
  font-size: 18px;
  line-height: 1.2;
}

.upload-button {
  display: block;
  padding: 11px 14px;
  border: 1px solid var(--color-text);
  background: var(--color-text);
  color: var(--color-background);
  font-size: 13px;
  font-weight: var(--weight-bold);
  text-align: center;
  cursor: pointer;

  input {
    display: none;
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.upload-progress {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  min-height: 40px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--color-border);

  > div {
    position: absolute;
    inset: 0 auto 0 0;
    background: rgb(255 255 255 / 18%);
  }

  span,
  button {
    position: relative;
    z-index: 1;
    padding: 8px 12px;
    font-size: 12px;
  }

  button {
    border-left: 1px solid var(--color-border);
  }
}

.media-start {
  display: flex;
  align-items: end;
  gap: 8px;
  margin-top: 12px;

  .field {
    display: grid;
    flex: 1;
    gap: 5px;
  }

  input {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: inherit;
    font: inherit;
  }

  button {
    padding: 9px 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-soft);
    font-size: 12px;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
}

.media-list {
  display: grid;
  gap: 5px;
  margin-top: 10px;
}

.media-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  font-size: 12px;
  cursor: pointer;

  > span {
    display: grid;
    min-width: 0;

    strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      color: var(--color-text-mute);
    }
  }

  button {
    padding: 5px 8px;
    border: 1px solid var(--color-border);

    &:disabled {
      opacity: 0.25;
    }
  }
}
</style>
