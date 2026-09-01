<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CONGESTION_LEVELS, SALES_STATUSES, hidesCongestion, isSubmitOpen } from '@shared/status'
import type { CongestionLevel, OrgStatus, SalesStatus, SubmitWindows } from '@shared/status'
import { ApiError, updateStatus } from '@/lib/api'
import { classOrgLabel } from '@/lib/orgLabel'
import { CONGESTION_LABELS, SALES_LABELS } from '@/lib/statusLabel'
import { formatElapsed } from '@/lib/relativeTime'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const props = defineProps<{
  token: string
  admin: boolean
  orgs: string[]
  statuses: OrgStatus[]
  windows: SubmitWindows
}>()

const emit = defineEmits<{ updated: [OrgStatus] }>()

const RESULT_TIMEOUT_MS = 10000

const selectedOrg = ref(props.orgs[0] ?? '')
const current = computed(
  () => props.statuses.find((status) => status.orgId === selectedOrg.value) ?? null,
)
const savedAt = computed(() => current.value?.updatedAt ?? null)

const sales = ref<SalesStatus | null>(current.value?.sales ?? null)
const congestion = ref<CongestionLevel | null>(current.value?.congestion ?? null)
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

const windowClosed = computed(() => {
  if (props.admin) return false
  return !isSubmitOpen(props.windows, Math.floor(now.value / 1000))
})

const canSubmit = computed(
  () =>
    sales.value !== null &&
    (hidesCongestion(sales.value) || congestion.value !== null) &&
    selectedOrg.value !== '' &&
    !windowClosed.value &&
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

function applyOrgStatus() {
  sales.value = current.value?.sales ?? null
  congestion.value = current.value?.congestion ?? null
  justSaved.value = false
  saveError.value = null
}

function selectOrg(id: string) {
  selectedOrg.value = id
  applyOrgStatus()
}

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
        props.admin ? selectedOrg.value : undefined,
      ),
    )
    justSaved.value = true
    scheduleResultClear()
  } catch (error) {
    saveError.value =
      error instanceof ApiError && error.status === 403
        ? '文化祭時間外です。'
        : '送信に失敗しました。'
    scheduleResultClear()
  } finally {
    saving.value = false
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
</script>

<template>
  <div class="status-editor" :class="{ admin }">
    <form @submit.prevent="submit">
      <label v-if="admin" class="org-select section-label">
        <span>団体</span>
        <select v-model="selectedOrg" @change="applyOrgStatus">
          <option v-for="id in orgs" :key="id" :value="id">{{ classOrgLabel(id) }}</option>
        </select>
      </label>

      <ul v-if="admin" class="org-list">
        <li v-for="id in orgs" :key="id">
          <button
            type="button"
            :class="{ selected: selectedOrg === id }"
            :aria-pressed="selectedOrg === id"
            @click="selectOrg(id)"
          >
            {{ classOrgLabel(id) }}
          </button>
        </li>
      </ul>

      <div class="groups">
        <p v-if="savedAt !== null" class="updated">
          最終更新 {{ savedTime }}（{{ elapsedLabel }}）
        </p>

        <fieldset class="sales">
          <legend class="section-label">販売状況</legend>
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
            <legend class="section-label">混雑状況</legend>
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

          <p v-if="windowClosed" class="result error" role="status">文化祭時間外です。</p>
          <p v-else-if="saveError" class="result error" role="status">{{ saveError }}</p>
          <p v-else-if="justSaved" class="result" role="status">更新しました。</p>

          <button type="submit" class="submit" :disabled="!canSubmit">
            {{ saving ? '送信中…' : '更新する' }}
          </button>
        </div>
      </div>
    </form>

    <ConfirmDialog
      :open="confirmingSoldout"
      message="本当に「全て完売」にしますか？"
      confirm-label="全て完売にする"
      @confirm="confirmSoldout"
      @cancel="confirmingSoldout = false"
    />
  </div>
</template>

<style scoped>
.status-editor {
  .updated {
    grid-area: updated;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--color-text-mute);
    font-size: 12px;
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

  form {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    padding: 24px 20px 20px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .groups {
    display: grid;
    grid-template-areas:
      'updated updated'
      'sales congestion';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
  }

  .org-select {
    display: none;
    flex-direction: column;

    @media (max-width: 560px) {
      display: flex;
    }
    gap: 6px;
    text-align: center;

    select {
      padding: 9px 12px;
      border: 1px solid var(--color-accent);
      background: var(--color-accent);
      color: var(--color-on-accent);
      font: inherit;
      text-align: center;
      cursor: pointer;
      color-scheme: light;

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
    }
  }

  .org-list {
    display: grid;
    align-content: start;

    @media (max-width: 560px) {
      display: none;
    }
    gap: 2px;
    padding: 0;
    max-height: 420px;
    overflow-y: auto;
    list-style: none;

    button {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid var(--color-border);
      color: var(--color-text-mute);
      font-size: 13px;
      text-align: center;
      cursor: pointer;

      &:hover:not(.selected) {
        background: var(--color-surface-soft);
      }

      &.selected {
        border-color: var(--color-accent);
        background: var(--color-accent);
        color: var(--color-on-accent);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }
  }

  .sales {
    grid-area: sales;
  }

  .col {
    grid-area: congestion;
    display: flex;
    flex-direction: column;
  }

  fieldset {
    border: none;
    padding: 0;

    legend {
      padding: 0 2px;
      margin-bottom: 10px;
      text-align: center;
    }
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px;
    background: var(--color-surface-soft);

    button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 13px 14px;
      border: 1px solid var(--c);
      font-size: 14px;
      text-wrap: nowrap;
      cursor: pointer;
      color: var(--color-text-mute);
      transition:
        background 0.18s ease,
        color 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.1s ease;

      &::before {
        content: '';
        position: absolute;
        left: 14px;
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

      &.sales-partial,
      &.congestion-medium {
        --c: var(--color-status-warn);
      }

      &.sales-low,
      &.congestion-high {
        --c: var(--color-status-bad);
      }

      &.sales-paused {
        --c: var(--color-status-pause);
      }

      &.sales-soldout {
        --c: var(--color-status-soldout);
      }

      &.selected {
        background: var(--c);
        color: var(--color-on-status);
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
    margin: auto 4px 4px;
    padding: 13px 4px;
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-size: 14px;
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
    animation: pop-in 0.25s ease;

    + .submit {
      margin-top: 10px;
    }
  }

  &.admin {
    form {
      grid-template-columns: minmax(0, 1fr) minmax(0, 420px) minmax(0, 1fr);

      @media (max-width: 940px) {
        grid-template-columns: minmax(0, 220px) minmax(0, 420px);
        justify-content: center;
      }

      @media (max-width: 560px) {
        grid-template-columns: minmax(0, 1fr);
      }
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
