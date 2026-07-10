<script setup lang="ts">
import { ref } from 'vue'
import { updateWindow } from '@/lib/api'
import type { SubmitWindow } from '@/lib/api'

const props = defineProps<{
  token: string
  window: SubmitWindow
}>()

const emit = defineEmits<{ updated: [SubmitWindow] }>()

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

const from = ref(toLocalInput(props.window.from))
const until = ref(toLocalInput(props.window.until))
const saving = ref(false)
const saved = ref(false)
const failed = ref(false)

async function save() {
  if (saving.value) return
  saving.value = true
  saved.value = false
  failed.value = false
  try {
    const updated = await updateWindow(props.token, {
      from: fromLocalInput(from.value),
      until: fromLocalInput(until.value),
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
    <p class="hint">未設定の項目は制限されません</p>
    <div class="fields">
      <label>
        <span>開始</span>
        <input v-model="from" type="datetime-local" />
      </label>
      <label>
        <span>終了</span>
        <input v-model="until" type="datetime-local" />
      </label>
    </div>
    <p v-if="failed" class="result error" role="status">保存に失敗しました</p>
    <p v-else-if="saved" class="result" role="status">保存しました</p>
    <button type="button" class="save" :disabled="saving" @click="save">
      {{ saving ? '保存中…' : '時間を保存' }}
    </button>
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

  .fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-mute);

      input {
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

  .save {
    display: block;
    width: 100%;
    margin-top: 12px;
    padding: 12px 4px;
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
}
</style>
