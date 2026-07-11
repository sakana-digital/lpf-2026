<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import type {
  OrgStatus,
  SignageConfig,
  SignageUploadedPart,
  SignageUploadStartResponse,
  SignageVideo,
} from '../../../../shared/status'
import {
  abortSignageUpload,
  completeSignageUpload,
  deleteSignageVideo,
  getSignageAdmin,
  getSignageVideos,
  issueSignageViewerToken,
  startSignageUpload,
  updateSignageConfig,
  uploadSignagePart,
} from '@/lib/api'
import { classOrgParams } from '@/lib/orgLabel'
import SignageCanvas from '@/components/SignageCanvas.vue'

const props = defineProps<{
  token: string
  orgs: string[]
  statuses: OrgStatus[]
}>()

const emptyConfig: SignageConfig = {
  orgIds: [],
  activeVideoKey: null,
  footerText: '',
  alertEnabled: false,
  alertText: '',
  updatedAt: 0,
}
const config = reactive<SignageConfig>({ ...emptyConfig })
const videos = ref<SignageVideo[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const failed = ref(false)
const viewerUrl = ref('')
const issuingUrl = ref(false)
const uploadProgress = ref<number | null>(null)
const uploadError = ref('')
const activeUpload = ref<SignageUploadStartResponse | null>(null)
let uploadController: AbortController | null = null

const previewVideoUrl = computed(() =>
  config.activeVideoKey ? `/api/signage/video/${encodeURIComponent(config.activeVideoKey)}` : null,
)

function orgLabel(id: string) {
  const params = classOrgParams(id)
  return params ? `${params.grade}年${params.classNo}組` : id
}

function isSelected(id: string) {
  return config.orgIds.includes(id)
}

function toggleOrg(id: string) {
  const index = config.orgIds.indexOf(id)
  if (index >= 0) {
    if (config.orgIds.length > 1) config.orgIds.splice(index, 1)
  } else {
    config.orgIds.push(id)
  }
}

function moveOrg(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= config.orgIds.length) return
  const current = config.orgIds[index]
  const other = config.orgIds[target]
  if (!current || !other) return
  config.orgIds.splice(index, 2, ...(direction === -1 ? [current, other] : [other, current]))
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const [payload, videoList] = await Promise.all([
      getSignageAdmin(props.token),
      getSignageVideos(props.token),
    ])
    Object.assign(config, payload.config)
    videos.value = videoList
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value || config.orgIds.length === 0) return
  saving.value = true
  saved.value = false
  failed.value = false
  try {
    Object.assign(
      config,
      await updateSignageConfig(props.token, {
        orgIds: [...config.orgIds],
        activeVideoKey: config.activeVideoKey,
        footerText: config.footerText,
        alertEnabled: config.alertEnabled,
        alertText: config.alertText,
      }),
    )
    saved.value = true
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}

async function issueUrl() {
  if (issuingUrl.value) return
  issuingUrl.value = true
  failed.value = false
  try {
    viewerUrl.value = (await issueSignageViewerToken(props.token)).url
  } catch {
    failed.value = true
  } finally {
    issuingUrl.value = false
  }
}

async function copyUrl() {
  if (!viewerUrl.value) return
  await navigator.clipboard.writeText(viewerUrl.value)
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
    } catch (error) {
      lastError = error
      if (uploadController?.signal.aborted) throw error
    }
  }
  throw lastError
}

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || activeUpload.value) return
  uploadError.value = ''
  uploadProgress.value = 0
  uploadController = new AbortController()
  try {
    const upload = await startSignageUpload(props.token, file)
    activeUpload.value = upload
    const partCount = Math.ceil(file.size / upload.partSize)
    const parts: SignageUploadedPart[] = []
    for (let index = 0; index < partCount; index += 1) {
      const start = index * upload.partSize
      const chunk = file.slice(start, Math.min(start + upload.partSize, file.size), 'video/mp4')
      parts.push(await retryPart(upload, index + 1, chunk))
      uploadProgress.value = Math.round(((index + 1) / partCount) * 100)
    }
    await completeSignageUpload(props.token, upload, parts)
    videos.value = await getSignageVideos(props.token)
  } catch {
    if (activeUpload.value) {
      try {
        await abortSignageUpload(props.token, activeUpload.value)
      } catch {
        // R2 also expires incomplete multipart uploads automatically.
      }
    }
    uploadError.value = uploadController.signal.aborted
      ? 'アップロードを中止しました'
      : '動画のアップロードに失敗しました'
  } finally {
    activeUpload.value = null
    uploadController = null
    uploadProgress.value = null
  }
}

function cancelUpload() {
  uploadController?.abort()
}

async function removeVideo(video: SignageVideo) {
  if (video.key === config.activeVideoKey) return
  try {
    await deleteSignageVideo(props.token, video.key)
    videos.value = videos.value.filter((item) => item.key !== video.key)
  } catch {
    failed.value = true
  }
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onMounted(load)
onUnmounted(cancelUpload)
</script>

<template>
  <section class="signage-editor">
    <p v-if="loading" class="editor-notice">サイネージ設定を読み込み中…</p>
    <template v-else>
      <div class="editor-grid">
        <div class="settings-column">
          <section class="block">
            <div class="block-heading">
              <div>
                <p class="index">01 / ORGANIZATIONS</p>
                <h2>表示する団体</h2>
              </div>
              <span>{{ config.orgIds.length }} 団体</span>
            </div>
            <div class="org-picker">
              <button
                v-for="id in orgs"
                :key="id"
                type="button"
                :class="{ selected: isSelected(id) }"
                :aria-pressed="isSelected(id)"
                @click="toggleOrg(id)"
              >
                {{ orgLabel(id) }}
              </button>
            </div>
            <ol class="org-order">
              <li v-for="(id, index) in config.orgIds" :key="id">
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <strong>{{ orgLabel(id) }}</strong>
                <button type="button" :disabled="index === 0" @click="moveOrg(index, -1)">↑</button>
                <button
                  type="button"
                  :disabled="index === config.orgIds.length - 1"
                  @click="moveOrg(index, 1)"
                >
                  ↓
                </button>
              </li>
            </ol>
          </section>

          <section class="block">
            <div class="block-heading">
              <div>
                <p class="index">02 / INFORMATION</p>
                <h2>フッター情報</h2>
              </div>
            </div>
            <label class="field">
              <span>固定案内（{{ config.footerText.length }}/120）</span>
              <input v-model="config.footerText" maxlength="120" />
            </label>
            <label class="switch-field">
              <input v-model="config.alertEnabled" type="checkbox" />
              <span>速報を配信する</span>
            </label>
            <label class="field">
              <span>速報文（{{ config.alertText.length }}/200）</span>
              <textarea v-model="config.alertText" maxlength="200" rows="3" />
            </label>
          </section>

          <section class="block">
            <div class="block-heading">
              <div>
                <p class="index">03 / VIDEO</p>
                <h2>R2 動画</h2>
              </div>
            </div>
            <label class="upload-button" :class="{ disabled: activeUpload }">
              MP4 をアップロード（最大 1 GiB）
              <input
                type="file"
                accept="video/mp4,.mp4"
                :disabled="Boolean(activeUpload)"
                @change="uploadFile"
              />
            </label>
            <div v-if="uploadProgress !== null" class="upload-progress">
              <div :style="{ width: `${uploadProgress}%` }" />
              <span>{{ uploadProgress }}%</span>
              <button type="button" @click="cancelUpload">中止</button>
            </div>
            <p v-if="uploadError" class="message error">{{ uploadError }}</p>
            <div class="video-list">
              <label class="video-item none">
                <input v-model="config.activeVideoKey" type="radio" :value="null" />
                <span>動画を表示しない</span>
              </label>
              <label v-for="video in videos" :key="video.key" class="video-item">
                <input v-model="config.activeVideoKey" type="radio" :value="video.key" />
                <span
                  ><strong>{{ video.name }}</strong
                  ><small>{{ formatSize(video.size) }}</small></span
                >
                <button
                  type="button"
                  :disabled="video.key === config.activeVideoKey"
                  @click.prevent="removeVideo(video)"
                >
                  削除
                </button>
              </label>
            </div>
          </section>

          <section class="block">
            <div class="block-heading">
              <div>
                <p class="index">04 / ACCESS</p>
                <h2>閲覧 URL</h2>
              </div>
            </div>
            <p class="hint">再発行すると、以前の URL と表示端末は無効になります。</p>
            <button type="button" class="issue" :disabled="issuingUrl" @click="issueUrl">
              {{ issuingUrl ? '発行中…' : viewerUrl ? '閲覧 URL を再発行' : '閲覧 URL を発行' }}
            </button>
            <div v-if="viewerUrl" class="issued-url">
              <input :value="viewerUrl" readonly />
              <button type="button" @click="copyUrl">コピー</button>
            </div>
          </section>
        </div>

        <aside class="preview-column">
          <p>LIVE PREVIEW / 16:9</p>
          <SignageCanvas
            :config="config"
            :statuses="statuses"
            :video-url="previewVideoUrl"
            preview
          />
        </aside>
      </div>

      <div class="save-bar">
        <p v-if="failed" class="message error">保存または取得に失敗しました</p>
        <p v-else-if="saved" class="message">保存しました</p>
        <button type="button" :disabled="saving || config.orgIds.length === 0" @click="save">
          {{ saving ? '保存中…' : 'サイネージ設定を保存' }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.signage-editor {
  color: var(--color-text);
}

.editor-notice,
.block,
.preview-column,
.save-bar {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.editor-notice {
  padding: 24px;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.settings-column {
  display: grid;
  gap: 16px;
}

.block {
  padding: 20px;
}

.block-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--color-text);

  h2 {
    font-size: 18px;
    line-height: 1.2;
  }

  > span,
  .index {
    color: var(--color-text-mute);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }
}

.org-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;

  button {
    padding: 9px 4px;
    border: 1px solid var(--color-border);
    font-size: 12px;
    cursor: pointer;

    &.selected {
      border-color: var(--color-text);
      background: var(--color-text);
      color: var(--color-background);
      font-weight: 800;
    }
  }
}

.org-order {
  display: grid;
  gap: 4px;
  max-height: 260px;
  margin-top: 12px;
  overflow-y: auto;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 32px 1fr 36px 36px;
    align-items: center;
    min-height: 38px;
    border-bottom: 1px solid var(--color-border);
    font-size: 12px;

    > span {
      color: var(--color-text-mute);
      font-variant-numeric: tabular-nums;
    }

    button {
      height: 100%;
      border-left: 1px solid var(--color-border);
      cursor: pointer;

      &:disabled {
        opacity: 0.25;
      }
    }
  }
}

.field {
  display: grid;
  gap: 5px;
  margin-top: 12px;
  color: var(--color-text-mute);
  font-size: 12px;
  font-weight: 700;

  input,
  textarea {
    width: 100%;
    padding: 10px;
    resize: vertical;
    border: 1px solid var(--color-border);
    background: var(--color-surface-soft);
    color: var(--color-text);
    font: inherit;
  }
}

.switch-field {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  font-size: 13px;
  font-weight: 700;
}

.upload-button,
.issue {
  display: block;
  padding: 11px 14px;
  border: 1px solid var(--color-text);
  background: var(--color-text);
  color: var(--color-background);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  cursor: pointer;

  input {
    display: none;
  }

  &.disabled,
  &:disabled {
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

.video-list {
  display: grid;
  gap: 5px;
  margin-top: 10px;
}

.video-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  font-size: 12px;

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

.hint {
  margin-bottom: 10px;
  color: var(--color-text-mute);
  font-size: 12px;
}

.issued-url {
  display: grid;
  grid-template-columns: 1fr auto;
  margin-top: 8px;

  input,
  button {
    min-width: 0;
    padding: 9px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-soft);
    color: var(--color-text);
    font: inherit;
    font-size: 11px;
  }
}

.preview-column {
  position: sticky;
  top: 16px;
  align-self: start;
  padding: 12px;

  > p {
    margin-bottom: 8px;
    color: var(--color-text-mute);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.14em;
  }
}

.save-bar {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;

  > button {
    padding: 12px 24px;
    border: 1px solid var(--color-text);
    background: var(--color-text);
    color: var(--color-background);
    font-weight: 800;

    &:disabled {
      opacity: 0.4;
    }
  }
}

.message {
  color: var(--color-status-good);
  font-size: 12px;
  font-weight: 700;

  &.error {
    color: var(--color-status-bad);
  }
}

@media (max-width: 900px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .preview-column {
    position: static;
    grid-row: 1;
  }
}
</style>
