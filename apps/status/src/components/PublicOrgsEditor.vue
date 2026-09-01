<script setup lang="ts">
import { computed, ref } from 'vue'
import { updateHiddenOrgs } from '@/lib/api'
import { classOrgLabel } from '@/lib/orgLabel'

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
    <h2 class="section-label">ステータスを表示する団体</h2>
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
          <span>{{ classOrgLabel(id) }}</span>
        </label>
      </li>
    </ul>
    <p v-if="failed" class="result error" role="status">保存に失敗しました</p>
    <p v-else-if="saved" class="result" role="status">保存しました</p>
    <button type="button" class="save outline-button" :disabled="saving" @click="save">
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

  .hint {
    margin-top: 2px;
  }

  .result {
    margin: 12px auto 0;
  }

  .bulk {
    display: flex;
    gap: 8px;
    margin-top: 12px;

    button {
      padding: 6px 12px;
      border: 1px solid var(--color-border);
      background: var(--color-surface-soft);
      font-size: 12px;
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
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 6px;
    margin-top: 12px;
    padding: 0;
    list-style: none;

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border: 1px solid var(--color-border);
      font-size: 13px;
      cursor: pointer;

      &:hover {
        background: var(--color-surface-soft);
      }

      &:has(input:checked) {
        border-color: var(--color-accent);
        background: var(--color-accent);
        color: var(--color-on-accent);

        input {
          accent-color: var(--color-on-accent);
        }
      }

      &:has(input:focus-visible) {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }
  }

  .save {
    width: 100%;
    margin-top: 16px;
  }
}
</style>
