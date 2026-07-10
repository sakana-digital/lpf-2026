<script setup lang="ts">
import { reactive, ref } from 'vue'
import { SUBMIT_DAYS } from '../../../../shared/status'
import type { SubmitWindows } from '../../../../shared/status'
import { updateWindows } from '@/lib/api'

const props = defineProps<{
  token: string
  windows: SubmitWindows
}>()

const emit = defineEmits<{ updated: [SubmitWindows] }>()

const DAY_LABELS: Record<(typeof SUBMIT_DAYS)[number], string> = {
  day1: 'Day 1',
  day2: 'Day 2',
}

function toLocalInput(epoch: number | null): string {
  if (epoch === null) return ''
  const date = new Date(epoch * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${ymd}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value: string): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : Math.floor(time / 1000)
}

const fields = reactive(
  Object.fromEntries(
    SUBMIT_DAYS.map((day) => [
      day,
      {
        from: toLocalInput(props.windows[day].from),
        until: toLocalInput(props.windows[day].until),
      },
    ]),
  ) as Record<(typeof SUBMIT_DAYS)[number], { from: string; until: string }>,
)

const saving = ref(false)
const saved = ref(false)
const failed = ref(false)

function clearFields() {
  for (const day of SUBMIT_DAYS) {
    fields[day].from = ''
    fields[day].until = ''
  }
}

async function save() {
  if (saving.value) return
  saving.value = true
  saved.value = false
  failed.value = false
  try {
    const updated = await updateWindows(props.token, {
      day1: { from: fromLocalInput(fields.day1.from), until: fromLocalInput(fields.day1.until) },
      day2: { from: fromLocalInput(fields.day2.from), until: fromLocalInput(fields.day2.until) },
    })
    saved.value = true
    emit('updated', updated)
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="window-editor">
    <h2>送信できる時間</h2>
    <p class="hint">未設定の日は制限されません（両日未設定なら常に送信可）</p>
    <fieldset v-for="day in SUBMIT_DAYS" :key="day" class="day">
      <legend>{{ DAY_LABELS[day] }}</legend>
      <div class="fields">
        <label>
          <span>開始</span>
          <input v-model="fields[day].from" type="datetime-local" />
        </label>
        <label>
          <span>終了</span>
          <input v-model="fields[day].until" type="datetime-local" />
        </label>
      </div>
    </fieldset>
    <p v-if="failed" class="result error" role="status">保存に失敗しました</p>
    <p v-else-if="saved" class="result" role="status">保存しました</p>
    <div class="actions">
      <button type="button" class="clear" :disabled="saving" @click="clearFields">クリア</button>
      <button type="button" class="save" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '時間を保存' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.window-editor {
  margin-top: 16px;
  padding: 24px 20px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);

  h2 {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--color-text-mute);
  }

  .hint {
    margin-top: 2px;
    font-size: 12px;
    color: var(--color-text-mute);
  }

  .day {
    border: none;
    padding: 0;
    margin: 12px 0 0;

    legend {
      padding: 0;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: var(--color-text-mute);
    }
  }

  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-mute);

      input {
        width: 100%;
        min-width: 0;
        padding: 10px 8px;
        border: 1px solid var(--color-border);
        background: var(--color-surface-soft);
        color: var(--color-text);
        font-family: inherit;
        font-size: 13px;
        color-scheme: dark;

        &:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      }
    }
  }

  .result {
    margin: 12px auto 0;
    padding: 6px 12px;
    width: fit-content;
    background: var(--color-status-good-soft);
    color: var(--color-status-good);
    font-size: 12px;
    font-weight: 700;
    text-align: center;

    &.error {
      background: var(--color-status-bad-soft);
      color: var(--color-status-bad);
    }
  }

  .actions {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px;
    margin-top: 16px;

    button {
      padding: 12px 16px;
      border: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      transition:
        background 0.18s ease,
        transform 0.1s ease;

      &:hover:not(:disabled) {
        background: var(--color-surface-soft);
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
      }
    }

    .clear {
      color: var(--color-text-mute);
    }
  }
}
</style>
