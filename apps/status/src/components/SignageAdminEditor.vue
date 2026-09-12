<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import type { SignageConfig } from '@shared/status'
import { readStored, writeStored } from '@shared/storage'
import { getSignageAdmin, issueSignageViewerToken, updateSignageConfig } from '@/lib/api'
import { fromLocalInput, toLocalInput } from '@/lib/localDateTime'
import { useSaveState } from '@/composables/useSaveState'
import SignageMediaEditor from '@/components/SignageMediaEditor.vue'
import { css, cx } from '@styled/css'
import {
  blockHeading,
  button,
  control,
  hint,
  paneCell,
  paneGrid,
  paneTitle,
  resultBadge,
} from '@styled/recipes'

const props = defineProps<{ token: string }>()

const emptyConfig: SignageConfig = {
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
const { saving, saved, failed, save: runSave } = useSaveState()
// Only the hash reaches D1, so the plain URL has to be kept on this device.
const VIEWER_URL_KEY = 'signage-viewer-url'
const viewerUrl = ref(readStored(VIEWER_URL_KEY) ?? '')
const issuingUrl = ref(false)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

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
  const updated = await runSave(() =>
    updateSignageConfig(props.token, {
      activeVideoKey: config.activeVideoKey,
      videoStartAt: fromLocalInput(videoStart.value),
      activeAudioKey: config.activeAudioKey,
      audioStartAt: fromLocalInput(audioStart.value),
      footerText: config.footerText,
      alertEnabled: config.alertEnabled,
      alertText: config.alertText,
    }),
  )
  if (!updated) return
  Object.assign(config, updated)
  videoStart.value = toLocalInput(config.videoStartAt)
  audioStart.value = toLocalInput(config.audioStartAt)
}

async function issueUrl() {
  if (issuingUrl.value) return
  issuingUrl.value = true
  failed.value = false
  try {
    viewerUrl.value = (await issueSignageViewerToken(props.token)).url
    writeStored(VIEWER_URL_KEY, viewerUrl.value)
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

const styles = {
  loading: cx(hint(), css({ padding: '8px 0' })),
  grid: paneGrid({ columns: 'two' }),
  cell: paneCell(),
  title: paneTitle(),
  half: css({
    gridColumn: 'span 1',
    '@container workspace (max-width: 820px)': { gridColumn: 'span 2' },
  }),
  field: css({ display: 'grid', gap: '5px', marginTop: '12px' }),
  control: cx(control(), css({ resize: 'vertical' })),
  switchField: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '14px',
    fontSize: '13px',
    cursor: 'pointer',
  }),
  issueHint: css({ marginBottom: '10px' }),
  issuedUrl: css({
    display: 'grid',
    gap: '4px',
    width: '100%',
    marginTop: '8px',
    padding: '9px',
    border: '1px solid token(colors.border)',
    background: 'surfaceSoft',
    fontSize: '11px',
    textAlign: 'left',
    wordBreak: 'break-all',
    cursor: 'pointer',
    transition: 'border-color token(durations.base) ease',
    _hover: { borderColor: 'borderStrong' },
    '& small': { color: 'textMute', fontSize: '10px', letterSpacing: '0.08em' },
  }),
  saveBar: css({
    gridColumn: 'span 2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '14px 16px',
    background: 'surface',
  }),
}
</script>

<template>
  <section>
    <p v-if="loading" :class="styles.loading">サイネージ設定を読み込み中…</p>
    <template v-else>
      <div :class="styles.grid">
        <h2 :class="styles.title">サイネージ</h2>

        <section :class="[styles.cell, styles.half]">
          <h2 :class="blockHeading()">フッター情報</h2>
          <label :class="cx(hint(), styles.field)">
            <span>固定案内（{{ config.footerText.length }}/120）</span>
            <input v-model="config.footerText" :class="styles.control" maxlength="120" />
          </label>
          <label :class="styles.switchField">
            <input v-model="config.alertEnabled" type="checkbox" />
            <span>速報を配信する</span>
          </label>
          <label :class="cx(hint(), styles.field)">
            <span>速報文（{{ config.alertText.length }}/200）</span>
            <textarea v-model="config.alertText" :class="styles.control" maxlength="200" rows="3" />
          </label>
        </section>

        <section :class="[styles.cell, styles.half]">
          <h2 :class="blockHeading()">閲覧 URL</h2>
          <p :class="cx(hint(), styles.issueHint)">
            再発行すると、以前の URL と表示端末は無効になります。
          </p>
          <button
            type="button"
            :class="button({ variant: 'primary' })"
            :disabled="issuingUrl"
            @click="issueUrl"
          >
            {{ issuingUrl ? '発行中…' : viewerUrl ? '閲覧 URL を再発行' : '閲覧 URL を発行' }}
          </button>
          <button v-if="viewerUrl" type="button" :class="styles.issuedUrl" @click="copyUrl">
            <span>{{ viewerUrl }}</span>
            <small>{{ copied ? 'コピーしました。' : 'クリックでコピー' }}</small>
          </button>
        </section>

        <div :class="[styles.cell, styles.half]">
          <SignageMediaEditor
            v-model:active-key="config.activeVideoKey"
            v-model:start-at="videoStart"
            :token
            kind="video"
          />
        </div>

        <div :class="[styles.cell, styles.half]">
          <SignageMediaEditor
            v-model:active-key="config.activeAudioKey"
            v-model:start-at="audioStart"
            :token
            kind="audio"
          />
        </div>
        <div :class="styles.saveBar">
          <p v-if="failed" :class="resultBadge({ tone: 'error' })">
            保存または取得に失敗しました。
          </p>
          <p v-else-if="saved" :class="resultBadge()">保存しました。</p>
          <button
            type="button"
            :class="button({ variant: 'primary' })"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? '保存中…' : 'サイネージ設定を保存' }}
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
