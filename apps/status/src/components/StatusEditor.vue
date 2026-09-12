<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  CONGESTION_LEVELS,
  SALES_STATUSES,
  hidesCongestion,
  isSubmitRefusal,
  submitAllow,
} from '@shared/status'
import type {
  CongestionLevel,
  OrgStatus,
  SalesStatus,
  SubmitRefusal,
  SubmitWindows,
} from '@shared/status'
import { ApiError, updateStatus } from '@/lib/api'
import { CONGESTION_LABELS, SALES_LABELS } from '@/lib/statusLabel'
import { formatElapsed } from '@/lib/relativeTime'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { CONGESTION_TONES, SALES_TONES, statusChip, statusDot } from '@/styles/status'
import { css, cx } from '@styled/css'
import { button, hint, resultBadge, sectionLabel } from '@styled/recipes'

const props = withDefaults(
  defineProps<{
    token: string
    admin: boolean
    orgId: string
    status: OrgStatus | null
    windows: SubmitWindows
    accepted?: boolean
    testing?: boolean
  }>(),
  { accepted: true, testing: false },
)

const emit = defineEmits<{ updated: [OrgStatus] }>()

const RESULT_TIMEOUT_MS = 10000

const REFUSAL_LABELS: Record<SubmitRefusal, string> = {
  not_accepted: '受付対象外です。',
  closed: '文化祭時間外です。',
}

const savedAt = computed(() => props.status?.updatedAt ?? null)

const sales = ref<SalesStatus | null>(null)
const congestion = ref<CongestionLevel | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)
const justSaved = ref(false)
const confirmingSoldout = ref(false)
const now = ref(Date.now())

const savedTime = computed(() => {
  if (savedAt.value === null) return ''
  return new Date(savedAt.value * 1000).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const elapsedLabel = computed(() => {
  if (savedAt.value === null) return ''
  return formatElapsed(savedAt.value, Math.floor(now.value / 1000))
})

const permission = computed(() =>
  submitAllow(
    props.windows,
    Math.floor(now.value / 1000),
    { admin: props.admin, accepted: props.accepted },
    props.testing,
  ),
)

// Why the form is blocked outranks how the last submit went.
const notice = computed<{ tone: 'ok' | 'error'; text: string } | null>(() => {
  if (!permission.value.allowed) {
    return { tone: 'error', text: REFUSAL_LABELS[permission.value.refusal] }
  }
  if (saveError.value) return { tone: 'error', text: saveError.value }
  if (justSaved.value) return { tone: 'ok', text: '更新しました。' }
  if (props.testing)
    return { tone: 'ok', text: 'テスト受付中です。送信内容はテスト終了時に削除します。' }
  return null
})

const canSubmit = computed(
  () =>
    sales.value !== null &&
    (hidesCongestion(sales.value) || congestion.value !== null) &&
    props.orgId !== '' &&
    permission.value.allowed &&
    !saving.value,
)

let resultTimer: ReturnType<typeof setTimeout> | undefined
let tickTimer: ReturnType<typeof setInterval> | undefined

function scheduleResultClear() {
  clearTimeout(resultTimer)
  resultTimer = setTimeout(() => {
    justSaved.value = false
    saveError.value = null
  }, RESULT_TIMEOUT_MS)
}

// The server can rewrite a status behind the form (ending a rehearsal), so the chips follow it.
watch(
  [() => props.orgId, () => props.status?.updatedAt ?? null],
  ([orgId], previous) => {
    sales.value = props.status?.sales ?? null
    congestion.value = props.status?.congestion ?? null
    if (previous?.[0] !== orgId) {
      justSaved.value = false
      saveError.value = null
    }
  },
  { immediate: true },
)

// Selling out is asked about once, when it is actually about to be sent.
function requestSubmit() {
  if (!canSubmit.value) return
  if (sales.value === 'soldout' && props.status?.sales !== 'soldout') {
    confirmingSoldout.value = true
    return
  }
  void submit()
}

function confirmSoldout() {
  confirmingSoldout.value = false
  void submit()
}

async function submit() {
  if (!canSubmit.value || sales.value === null) return
  saving.value = true
  saveError.value = null
  justSaved.value = false
  try {
    const congestionValue = hidesCongestion(sales.value) ? null : congestion.value
    emit(
      'updated',
      await updateStatus(
        props.token,
        sales.value,
        congestionValue,
        props.admin ? props.orgId : undefined,
      ),
    )
    justSaved.value = true
  } catch (error) {
    const code = error instanceof ApiError ? error.code : null
    saveError.value = isSubmitRefusal(code) ? REFUSAL_LABELS[code] : '送信に失敗しました。'
  } finally {
    saving.value = false
    scheduleResultClear()
  }
}

onMounted(() => {
  tickTimer = setInterval(() => {
    now.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  clearInterval(tickTimer)
  clearTimeout(resultTimer)
})

const styles = {
  form: css({ display: 'flex', flexDirection: 'column', gap: '16px' }),
  groups: css({
    display: 'grid',
    gridTemplateAreas: '"top top" "sales congestion"',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '16px',
    width: '100%',
    maxWidth: '440px',
    margin: '0 auto',
  }),
  top: css({
    gridArea: 'top',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '31px',
  }),
  updated: cx(
    hint(),
    statusDot({ tone: 'good' }),
    css({
      fontSize: '13px',
      fontVariantNumeric: 'tabular-nums',
      _before: { animation: 'pulse 2.4s ease-in-out infinite' },
    }),
  ),
  result: css({ fontSize: '13px', animation: 'popIn 0.25s ease' }),
  fieldset: css({ display: 'flex', flexDirection: 'column', border: 'none', padding: 0 }),
  sales: css({ gridArea: 'sales' }),
  congestion: css({ gridArea: 'congestion' }),
  legend: cx(
    sectionLabel(),
    css({ padding: '0 2px', marginBottom: '10px', fontSize: '14px', textAlign: 'center' }),
  ),
  // The button sits in the same column as the chips so the two grids line up.
  choices: css({ display: 'flex', flex: 1, flexDirection: 'column', gap: '6px' }),
  submit: css({
    height: 'auto',
    marginTop: 'auto',
    padding: '11px 16px',
    fontSize: '16px',
    fontWeight: 'black',
  }),
}
</script>

<template>
  <form :class="styles.form" @submit.prevent="requestSubmit">
    <div :class="styles.groups">
      <div :class="styles.top">
        <p
          v-if="notice"
          :class="cx(resultBadge({ tone: notice.tone }), styles.result)"
          role="status"
        >
          {{ notice.text }}
        </p>
        <p v-else-if="savedAt !== null" :class="styles.updated">
          最終更新 {{ savedTime }}（{{ elapsedLabel }}）
        </p>
      </div>

      <fieldset :class="[styles.fieldset, styles.sales]">
        <legend :class="styles.legend">販売状況</legend>
        <div :class="styles.choices">
          <button
            v-for="value in SALES_STATUSES"
            :key="value"
            type="button"
            :class="statusChip({ tone: SALES_TONES[value], selected: sales === value })"
            :aria-pressed="sales === value"
            @click="sales = value"
          >
            {{ SALES_LABELS[value] }}
          </button>
        </div>
      </fieldset>

      <fieldset :class="[styles.fieldset, styles.congestion]">
        <legend :class="styles.legend">混雑状況</legend>
        <div :class="styles.choices">
          <button
            v-for="value in CONGESTION_LEVELS"
            :key="value"
            type="button"
            :class="statusChip({ tone: CONGESTION_TONES[value], selected: congestion === value })"
            :aria-pressed="congestion === value"
            :disabled="sales !== null && hidesCongestion(sales)"
            @click="congestion = value"
          >
            {{ CONGESTION_LABELS[value] }}
          </button>
          <button
            type="submit"
            :class="cx(button({ variant: 'primary' }), styles.submit)"
            :disabled="!canSubmit"
          >
            {{ saving ? '送信中…' : '更新する' }}
          </button>
        </div>
      </fieldset>
    </div>

    <ConfirmDialog
      :open="confirmingSoldout"
      message="本当に「全て完売」にしますか？"
      confirm-label="全て完売にする"
      @confirm="confirmSoldout"
      @cancel="confirmingSoldout = false"
    />
  </form>
</template>
