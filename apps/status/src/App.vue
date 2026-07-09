<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CONGESTION_LEVELS, SALES_STATUSES } from '../../../shared/status'
import type { CongestionLevel, SalesStatus } from '../../../shared/status'
import { ApiError, getMe, updateStatus } from '@/lib/api'
import { resolveToken } from '@/lib/token'
import { classOrgParams } from '@/lib/orgLabel'
import { formatElapsed } from '@/lib/relativeTime'

const SALES_LABELS: Record<SalesStatus, string> = {
  available: '販売中',
  low: '残りわずか',
  soldout: '完売',
}

const CONGESTION_LABELS: Record<CongestionLevel, string> = {
  low: '空いている',
  medium: 'やや混雑',
  high: '混雑',
}

const token = resolveToken()

type Phase = 'missing' | 'loading' | 'ready' | 'invalid' | 'error'
const phase = ref<Phase>(token ? 'loading' : 'missing')

const orgId = ref('')
const sales = ref<SalesStatus | null>(null)
const congestion = ref<CongestionLevel | null>(null)
const saving = ref(false)
const savedAt = ref<number | null>(null)
const saveFailed = ref(false)
const justSaved = ref(false)
const now = ref(Date.now())

const orgLabel = computed(() => {
  const params = classOrgParams(orgId.value)
  return params ? `${params.grade}年${params.classNo}組` : orgId.value
})

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

const canSubmit = computed(() => sales.value !== null && congestion.value !== null && !saving.value)

let tickTimer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  tickTimer = setInterval(() => {
    now.value = Date.now()
  }, 30000)

  if (!token) return
  try {
    const me = await getMe(token)
    orgId.value = me.orgId
    sales.value = me.status?.sales ?? null
    congestion.value = me.status?.congestion ?? null
    savedAt.value = me.status?.updatedAt ?? null
    phase.value = 'ready'
  } catch (error) {
    phase.value = error instanceof ApiError && error.status === 401 ? 'invalid' : 'error'
  }
})

onUnmounted(() => {
  clearInterval(tickTimer)
})

async function submit() {
  if (!token || sales.value === null || congestion.value === null || saving.value) return
  saving.value = true
  saveFailed.value = false
  justSaved.value = false
  try {
    const updated = await updateStatus(token, sales.value, congestion.value)
    savedAt.value = updated.updatedAt
    justSaved.value = true
  } catch {
    saveFailed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="status-app">
    <header>
      <div class="heading">
        <h1>ステータスを送信</h1>
        <p v-if="phase === 'ready'" class="org">{{ orgLabel }}</p>
      </div>
      <p v-if="phase === 'ready' && savedAt !== null" class="updated">
        最終更新 {{ savedTime }}（{{ elapsedLabel }}）
      </p>
    </header>

    <p v-if="phase === 'missing'" class="notice">
      アクセス用 URL が正しくありません。配布された URL からアクセスしてください。
    </p>
    <p v-else-if="phase === 'invalid'" class="notice">
      トークンが無効です。配布された URL を確認してください。
    </p>
    <p v-else-if="phase === 'error'" class="notice">
      読み込みに失敗しました。ページを再読み込みしてください。
    </p>
    <p v-else-if="phase === 'loading'" class="notice mute">読み込み中…</p>

    <form v-else @submit.prevent="submit">
      <fieldset>
        <legend>販売状況</legend>
        <div class="choices">
          <button
            v-for="value in SALES_STATUSES"
            :key="value"
            type="button"
            :class="[`sales-${value}`, { selected: sales === value }]"
            :aria-pressed="sales === value"
            @click="sales = value"
          >
            {{ SALES_LABELS[value] }}
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>混雑状況</legend>
        <div class="choices">
          <button
            v-for="value in CONGESTION_LEVELS"
            :key="value"
            type="button"
            :class="[`congestion-${value}`, { selected: congestion === value }]"
            :aria-pressed="congestion === value"
            @click="congestion = value"
          >
            {{ CONGESTION_LABELS[value] }}
          </button>
        </div>
      </fieldset>

      <button type="submit" class="submit" :disabled="!canSubmit">
        {{ saving ? '送信中…' : '更新する' }}
      </button>

      <p v-if="saveFailed" class="result error" role="status">
        送信に失敗しました。通信環境を確認して再度お試しください。
      </p>
      <p v-else-if="justSaved" class="result" role="status">更新しました</p>
    </form>
  </main>
</template>

<style scoped>
.status-app {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px 48px;

  header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 24px;

    .heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;

      h1 {
        font-size: 20px;
        font-weight: 700;
      }

      .org {
        font-size: 16px;
        font-weight: 500;
        color: var(--color-text-mute);
      }
    }

    .updated {
      font-size: 12px;
      color: var(--color-text-mute);
      font-variant-numeric: tabular-nums;
    }
  }

  .notice {
    padding: 16px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 14px;

    &.mute {
      border: none;
      color: var(--color-text-mute);
    }
  }

  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 24px;

    legend {
      padding: 0;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 700;
    }
  }

  .choices {
    display: flex;
    gap: 6px;
    padding: 4px;
    border-radius: 999px;

    button {
      flex: 1;
      padding: 14px 4px;
      border: 1.5px solid transparent;
      border-radius: 999px;
      background: transparent;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;

      &.sales-available,
      &.congestion-low {
        border-color: var(--color-status-good);
        color: var(--color-status-good);
      }

      &.sales-low,
      &.congestion-medium {
        border-color: var(--color-status-warn);
        color: var(--color-status-warn);
      }

      &.sales-soldout,
      &.congestion-high {
        border-color: var(--color-status-bad);
        color: var(--color-status-bad);
      }

      &.selected {
        color: var(--color-on-accent);
        font-weight: 700;

        &.sales-available,
        &.congestion-low {
          background: var(--color-status-good);
        }

        &.sales-low,
        &.congestion-medium {
          background: var(--color-status-warn);
        }

        &.sales-soldout,
        &.congestion-high {
          background: var(--color-status-bad);
        }
      }
    }
  }

  .submit {
    display: block;
    width: auto;
    margin: 24px auto 0;
    padding: 14px 48px;
    border: none;
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .result {
    margin-top: 16px;
    font-size: 14px;
    text-align: center;

    &.error {
      color: var(--color-status-bad);
    }
  }
}
</style>
