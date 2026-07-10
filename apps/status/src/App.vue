<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CONGESTION_LEVELS, SALES_STATUSES, hidesCongestion } from '../../../shared/status'
import type { CongestionLevel, OrgStatus, SalesStatus } from '../../../shared/status'
import { ApiError, getAllStatuses, getMe, updateStatus } from '@/lib/api'
import type { SubmitWindow } from '@/lib/api'
import { resolveToken } from '@/lib/token'
import { classOrgParams } from '@/lib/orgLabel'
import { formatElapsed } from '@/lib/relativeTime'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import SubmitWindowEditor from '@/components/SubmitWindowEditor.vue'

const SALES_LABELS: Record<SalesStatus, string> = {
  available: '販売中',
  paused: '販売休止中',
  partial: '一部完売',
  low: '残りわずか',
  soldout: '全て完売',
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
const saveError = ref<string | null>(null)
const justSaved = ref(false)
const now = ref(Date.now())

const isAdmin = ref(false)
const orgs = ref<string[]>([])
const selectedOrg = ref('')
const submitWindow = ref<SubmitWindow>({ from: null, until: null })
const orgStatuses = ref(new Map<string, OrgStatus>())

function orgOptionLabel(id: string) {
  const params = classOrgParams(id)
  return params ? `${params.grade}年${params.classNo}組` : id
}

const orgLabel = computed(() => (isAdmin.value ? '管理者' : orgOptionLabel(orgId.value)))

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

const windowClosed = computed(() => {
  if (isAdmin.value) return false
  const { from, until } = submitWindow.value
  const nowSec = Math.floor(now.value / 1000)
  if (from !== null && nowSec < from) return true
  if (until !== null && nowSec > until) return true
  return false
})

const canSubmit = computed(
  () =>
    sales.value !== null &&
    (hidesCongestion(sales.value) || congestion.value !== null) &&
    (!isAdmin.value || selectedOrg.value !== '') &&
    !windowClosed.value &&
    !saving.value,
)

const confirmingSoldout = ref(false)

function selectSales(value: SalesStatus) {
  if (value === 'soldout' && sales.value !== 'soldout') {
    confirmingSoldout.value = true
    return
  }
  sales.value = value
}

function confirmSoldout() {
  sales.value = 'soldout'
  confirmingSoldout.value = false
}

let tickTimer: ReturnType<typeof setInterval> | undefined

onMounted(async () => {
  tickTimer = setInterval(() => {
    now.value = Date.now()
  }, 30000)

  if (!token) return
  try {
    const me = await getMe(token)
    submitWindow.value = me.window
    if ('admin' in me) {
      isAdmin.value = true
      orgs.value = me.orgs
      const statuses = await getAllStatuses()
      orgStatuses.value = new Map(statuses.map((status) => [status.orgId, status]))
      selectedOrg.value = me.orgs[0] ?? ''
      applyOrgStatus()
    } else {
      orgId.value = me.orgId
      sales.value = me.status?.sales ?? null
      congestion.value = me.status?.congestion ?? null
      savedAt.value = me.status?.updatedAt ?? null
    }
    phase.value = 'ready'
  } catch (error) {
    phase.value = error instanceof ApiError && error.status === 401 ? 'invalid' : 'error'
  }
})

function applyOrgStatus() {
  const status = orgStatuses.value.get(selectedOrg.value) ?? null
  sales.value = status?.sales ?? null
  congestion.value = status?.congestion ?? null
  savedAt.value = status?.updatedAt ?? null
  justSaved.value = false
  saveError.value = null
}

onUnmounted(() => {
  clearInterval(tickTimer)
})

async function submit() {
  if (!token || !canSubmit.value || sales.value === null) return
  saving.value = true
  saveError.value = null
  justSaved.value = false
  try {
    const congestionValue = hidesCongestion(sales.value) ? null : congestion.value
    const updated = await updateStatus(
      token,
      sales.value,
      congestionValue,
      isAdmin.value ? selectedOrg.value : undefined,
    )
    savedAt.value = updated.updatedAt
    if (isAdmin.value) orgStatuses.value.set(updated.orgId, updated)
    justSaved.value = true
  } catch (error) {
    saveError.value =
      error instanceof ApiError && error.status === 403
        ? '現在は送信できる時間ではありません。'
        : '送信に失敗しました。通信環境を確認して再度お試しください。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="status-app">
    <header>
      <div class="heading">
        <h1>{{ isAdmin ? 'ステータスを管理' : 'ステータスを送信' }}</h1>
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
      <label v-if="isAdmin" class="org-select">
        <span>団体</span>
        <select v-model="selectedOrg" @change="applyOrgStatus">
          <option v-for="id in orgs" :key="id" :value="id">{{ orgOptionLabel(id) }}</option>
        </select>
      </label>

      <div class="groups">
        <fieldset>
          <legend>販売状況</legend>
          <div class="choices">
            <button
              v-for="value in SALES_STATUSES"
              :key="value"
              type="button"
              :class="[`sales-${value}`, { selected: sales === value }]"
              :aria-pressed="sales === value"
              @click="selectSales(value)"
            >
              {{ SALES_LABELS[value] }}
            </button>
          </div>
        </fieldset>

        <div class="col">
          <fieldset>
            <legend>混雑状況</legend>
            <div class="choices">
              <button
                v-for="value in CONGESTION_LEVELS"
                :key="value"
                type="button"
                :class="[`congestion-${value}`, { selected: congestion === value }]"
                :aria-pressed="congestion === value"
                :disabled="sales !== null && hidesCongestion(sales)"
                @click="congestion = value"
              >
                {{ CONGESTION_LABELS[value] }}
              </button>
            </div>
          </fieldset>

          <p v-if="windowClosed" class="result error" role="status">
            現在は送信できる時間ではありません
          </p>
          <p v-else-if="saveError" class="result error" role="status">{{ saveError }}</p>
          <p v-else-if="justSaved" class="result" role="status">更新しました</p>

          <button type="submit" class="submit" :disabled="!canSubmit">
            {{ saving ? '送信中…' : '更新する' }}
          </button>
        </div>
      </div>
    </form>

    <SubmitWindowEditor
      v-if="phase === 'ready' && isAdmin && token"
      :token="token"
      :window="submitWindow"
      @updated="submitWindow = $event"
    />

    <ConfirmDialog
      :open="confirmingSoldout"
      message="本当に「全て完売」にしますか？"
      confirm-label="全て完売にする"
      @confirm="confirmSoldout"
      @cancel="confirmingSoldout = false"
    />
  </main>
</template>

<style scoped>
.status-app {
  max-width: 440px;
  margin: 0 auto;
  padding: 32px 20px 56px;

  header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 20px;
    padding: 0 4px;

    .heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      h1 {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.01em;
      }

      .org {
        padding: 4px 14px;
        background: var(--color-accent);
        color: var(--color-on-accent);
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
      }
    }

    .updated {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--color-text-mute);
      font-variant-numeric: tabular-nums;

      &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--color-status-good);
        animation: pulse 2.4s ease-in-out infinite;
      }
    }
  }

  .notice {
    padding: 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    font-size: 14px;

    &.mute {
      background: transparent;
      border: none;
      color: var(--color-text-mute);
      text-align: center;
    }
  }

  form {
    padding: 24px 20px 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .org-select {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 16px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--color-text-mute);

    select {
      padding: 12px 10px;
      border: 1px solid var(--color-border);
      background: var(--color-surface-soft);
      color: var(--color-text);
      font-family: inherit;
      font-size: 14px;
      color-scheme: dark;

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
    }
  }

  .groups {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .col {
    display: flex;
    flex-direction: column;
  }

  fieldset {
    border: none;
    padding: 0;
    margin: 0;

    legend {
      padding: 0 2px;
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--color-text-mute);
    }
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
    background: var(--color-surface-soft);

    button {
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      padding: 13px 14px;
      border: 1px solid var(--c);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      color: var(--color-text-mute);
      transition:
        background 0.18s ease,
        color 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.1s ease;

      &::before {
        content: '';
        flex: none;
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--c);
        transition: background 0.18s ease;
      }

      &:active {
        transform: scale(0.96);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }

      &.sales-available,
      &.congestion-low {
        --c: var(--color-status-good);
      }

      &.sales-paused {
        --c: var(--color-status-pause);
      }

      &.sales-partial {
        --c: var(--color-status-partial);
      }

      &.congestion-medium {
        --c: var(--color-status-warn);
      }

      &.sales-low,
      &.congestion-high {
        --c: var(--color-status-bad);
      }

      &.sales-soldout {
        --c: var(--color-status-soldout);
      }

      &.selected {
        background: var(--c);
        color: var(--color-on-status);
        font-weight: 700;
        box-shadow:
          0 0 10px oklch(from var(--c) l c h / 0.6),
          0 0 28px oklch(from var(--c) l c h / 0.4);

        &.sales-paused,
        &.sales-partial,
        &.congestion-medium {
          color: var(--color-on-status-warn);
        }

        &.sales-soldout {
          color: #fff;
        }

        &::before {
          background: currentColor;
        }
      }

      &:disabled {
        --c: oklch(60% 0 0 / 0.5);
        color: oklch(100% 0 0 / 0.35);
        cursor: not-allowed;
        box-shadow: none;

        &.selected {
          background: oklch(60% 0 0 / 0.35);
          color: oklch(100% 0 0 / 0.6);
        }
      }
    }
  }

  .submit {
    display: block;
    margin: auto 4px 4px;
    padding: 13px 4px;
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow:
      0 0 10px oklch(100% 0 0 / 0.4),
      0 0 28px oklch(100% 0 0 / 0.3);
    transition:
      background 0.18s ease,
      box-shadow 0.18s ease,
      transform 0.1s ease;

    &:hover:not(:disabled) {
      background: var(--color-accent-strong);
    }

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
    }
  }

  .result {
    margin: auto auto 0;
    padding: 6px 12px;
    width: fit-content;
    background: var(--color-status-good-soft);
    color: var(--color-status-good);
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    animation: pop-in 0.25s ease;

    &.error {
      background: var(--color-status-bad-soft);
      color: var(--color-status-bad);
    }

    + .submit {
      margin-top: 10px;
    }
  }
}

@keyframes pulse {
  50% {
    opacity: 0.3;
  }
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}
</style>
