<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import type { OrgStatus, SignageConfig } from '@shared/status'
import { getSignageAdmin, issueSignageViewerToken, updateSignageConfig } from '@/lib/api'
import { classOrgLabel } from '@/lib/orgLabel'
import { fromLocalInput, toLocalInput } from '@/lib/localDateTime'
import SignageCanvas from '@/components/SignageCanvas.vue'
import SignageMediaEditor from '@/components/SignageMediaEditor.vue'

const props = defineProps<{
  token: string
  orgs: string[]
  statuses: OrgStatus[]
}>()

const emptyConfig: SignageConfig = {
  orgIds: [],
  activeVideoKey: null,
  videoStartAt: null,
  activeAudioKey: null,
  audioStartAt: null,
  footerText: '',
  alertEnabled: false,
  alertText: '',
  updatedAt: 0,
}
const config = reactive<SignageConfig>({ ...emptyConfig })
const videoStart = ref('')
const audioStart = ref('')
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const failed = ref(false)
// Only the hash reaches D1, so the plain URL has to be kept on this device.
const VIEWER_URL_KEY = 'signage-viewer-url'
const viewerUrl = ref(localStorage.getItem(VIEWER_URL_KEY) ?? '')
const issuingUrl = ref(false)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

const previewVideoUrl = computed(() =>
  config.activeVideoKey ? `/api/signage/video/${encodeURIComponent(config.activeVideoKey)}` : null,
)

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
  const moved = config.orgIds[index]
  const swapped = config.orgIds[target]
  if (moved === undefined || swapped === undefined) return
  config.orgIds[index] = swapped
  config.orgIds[target] = moved
}

async function load() {
  loading.value = true
  failed.value = false
  try {
    const payload = await getSignageAdmin(props.token)
    Object.assign(config, payload.config)
    videoStart.value = toLocalInput(payload.config.videoStartAt)
    audioStart.value = toLocalInput(payload.config.audioStartAt)
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
        videoStartAt: fromLocalInput(videoStart.value),
        activeAudioKey: config.activeAudioKey,
        audioStartAt: fromLocalInput(audioStart.value),
        footerText: config.footerText,
        alertEnabled: config.alertEnabled,
        alertText: config.alertText,
      }),
    )
    videoStart.value = toLocalInput(config.videoStartAt)
    audioStart.value = toLocalInput(config.audioStartAt)
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
    localStorage.setItem(VIEWER_URL_KEY, viewerUrl.value)
  } catch {
    failed.value = true
  } finally {
    issuingUrl.value = false
  }
}

async function copyUrl() {
  if (!viewerUrl.value) return
  await navigator.clipboard.writeText(viewerUrl.value)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

onMounted(load)
onUnmounted(() => clearTimeout(copyTimer))
</script>

<template>
  <section class="signage-editor">
    <p v-if="loading" class="editor-notice">サイネージ設定を読み込み中…</p>
    <template v-else>
      <div class="editor-grid">
        <div class="settings-column">
          <section class="block">
            <h2 class="block-heading">
              表示する団体
              <span>{{ config.orgIds.length }} 団体</span>
            </h2>
            <div class="org-picker">
              <button
                v-for="id in orgs"
                :key="id"
                type="button"
                :class="{ selected: isSelected(id) }"
                :aria-pressed="isSelected(id)"
                @click="toggleOrg(id)"
              >
                {{ classOrgLabel(id) }}
              </button>
            </div>
            <ol class="org-order">
              <li v-for="(id, index) in config.orgIds" :key="id">
                <span>{{ String(index + 1).padStart(2, '0') }}</span>
                <strong>{{ classOrgLabel(id) }}</strong>
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
            <h2 class="block-heading">フッター情報</h2>
            <label class="field hint">
              <span>固定案内（{{ config.footerText.length }}/120）</span>
              <input v-model="config.footerText" maxlength="120" />
            </label>
            <label class="switch-field">
              <input v-model="config.alertEnabled" type="checkbox" />
              <span>速報を配信する</span>
            </label>
            <label class="field hint">
              <span>速報文（{{ config.alertText.length }}/200）</span>
              <textarea v-model="config.alertText" maxlength="200" rows="3" />
            </label>
          </section>

          <SignageMediaEditor
            v-model:active-key="config.activeVideoKey"
            v-model:start-at="videoStart"
            :token
            kind="video"
          />

          <SignageMediaEditor
            v-model:active-key="config.activeAudioKey"
            v-model:start-at="audioStart"
            :token
            kind="audio"
          />

          <section class="block">
            <h2 class="block-heading">閲覧 URL</h2>
            <p class="hint">再発行すると、以前の URL と表示端末は無効になります。</p>
            <button type="button" class="issue" :disabled="issuingUrl" @click="issueUrl">
              {{ issuingUrl ? '発行中…' : viewerUrl ? '閲覧 URL を再発行' : '閲覧 URL を発行' }}
            </button>
            <button v-if="viewerUrl" type="button" class="issued-url" @click="copyUrl">
              <span>{{ viewerUrl }}</span>
              <small>{{ copied ? 'コピーしました' : 'クリックでコピー' }}</small>
            </button>
          </section>
        </div>

        <aside class="preview-column">
          <p class="section-label">プレビュー</p>
          <SignageCanvas
            :config="config"
            :statuses="statuses"
            :video-url="previewVideoUrl"
            preview
          />
        </aside>
      </div>

      <div class="save-bar">
        <p v-if="failed" class="result error">保存または取得に失敗しました</p>
        <p v-else-if="saved" class="result">保存しました</p>
        <button type="button" :disabled="saving || config.orgIds.length === 0" @click="save">
          {{ saving ? '保存中…' : 'サイネージ設定を保存' }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
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
  font-size: 18px;
  line-height: 1.2;

  > span {
    color: var(--color-text-mute);
    font-size: 11px;
    font-weight: normal;
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
  cursor: pointer;
}

.issue {
  display: block;
  padding: 11px 14px;
  border: 1px solid var(--color-text);
  background: var(--color-text);
  color: var(--color-background);
  font-size: 13px;
  font-weight: var(--weight-bold);
  text-align: center;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.hint {
  margin-bottom: 10px;
}

.issued-url {
  display: grid;
  gap: 4px;
  width: 100%;
  margin-top: 8px;
  padding: 9px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-soft);
  font-size: 11px;
  text-align: left;
  word-break: break-all;
  cursor: pointer;

  &:hover {
    border-color: var(--color-text);
  }

  small {
    color: var(--color-text-mute);
    font-size: 10px;
    letter-spacing: 0.08em;
  }
}

.preview-column {
  position: sticky;
  top: 16px;
  align-self: start;
  padding: 12px;

  > p {
    margin-bottom: 8px;
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

    &:disabled {
      opacity: 0.4;
    }
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
