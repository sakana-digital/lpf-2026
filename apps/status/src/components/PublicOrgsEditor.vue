<script setup lang="ts">
import { computed, ref } from 'vue'
import { updateHiddenOrgs } from '@/lib/api'
import { classOrgParams } from '@/lib/orgLabel'

const props = defineProps<{
  token: string
  orgs: string[]
  hidden: string[]
}>()

const emit = defineEmits<{ updated: [string[]] }>()

const hidden = ref(new Set(props.hidden))
const saving = ref(false)
const saved = ref(false)
const failed = ref(false)

const shownCount = computed(() => props.orgs.filter((id) => !hidden.value.has(id)).length)

function orgLabel(id: string): string {
  const params = classOrgParams(id)
  return params ? `${params.grade}年${params.classNo}組` : id
}

function toggle(id: string) {
  const next = new Set(hidden.value)
  if (!next.delete(id)) next.add(id)
  hidden.value = next
  saved.value = false
}

function setAll(shown: boolean) {
  hidden.value = shown ? new Set() : new Set(props.orgs)
  saved.value = false
}

async function save() {
  if (saving.value) return
  saving.value = true
  saved.value = false
  failed.value = false
  try {
    const updated = await updateHiddenOrgs(props.token, [...hidden.value])
    hidden.value = new Set(updated.hidden)
    saved.value = true
    emit('updated', updated.hidden)
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="orgs-editor">
    <h2>ステータスを表示する団体</h2>
    <p class="hint">
      外した団体は公開サイトにステータスが出ません（{{ shownCount }} / {{ orgs.length }} 団体）
    </p>
    <div class="bulk">
      <button type="button" :disabled="saving" @click="setAll(true)">すべて表示</button>
      <button type="button" :disabled="saving" @click="setAll(false)">すべて非表示</button>
    </div>
    <ul class="list">
      <li v-for="id in orgs" :key="id">
        <label>
          <input type="checkbox" :checked="!hidden.has(id)" @change="toggle(id)" />
          <span>{{ orgLabel(id) }}</span>
        </label>
      </li>
    </ul>
    <p v-if="failed" class="result error" role="status">保存に失敗しました</p>
    <p v-else-if="saved" class="result" role="status">保存しました</p>
    <button type="button" class="save" :disabled="saving" @click="save">
      {{ saving ? '保存中…' : '表示する団体を保存' }}
    </button>
  </section>
</template>

<style scoped>
.orgs-editor {
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

  .bulk {
    display: flex;
    gap: 8px;
    margin-top: 12px;

    button {
      padding: 6px 12px;
      border: 1px solid var(--color-border);
      background: var(--color-surface-soft);
      color: var(--color-text);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--color-border);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
    }
  }

  .list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 4px 8px;
    margin-top: 12px;
    padding: 0;
    list-style: none;

    label {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 4px;
      font-size: 13px;
      color: var(--color-text);

      input {
        accent-color: var(--color-accent);
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
    width: 100%;
    margin-top: 16px;
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
}
</style>
