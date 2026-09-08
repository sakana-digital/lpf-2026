<script setup lang="ts">
import { ref, watch } from 'vue'
import type { StatusHistoryEntry } from '@shared/status'
import { getStatusHistory } from '@/lib/api'
import { CONGESTION_LABELS, SALES_LABELS } from '@/lib/statusLabel'

const props = defineProps<{
  token: string
  orgId: string
}>()

const entries = ref<StatusHistoryEntry[]>([])
const loading = ref(false)
const failed = ref(false)

const SOURCE_LABELS: Record<StatusHistoryEntry['source'], string> = {
  org: '団体',
  admin: '管理者',
}

function formatTime(sec: number): string {
  return new Date(sec * 1000).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function reload() {
  if (!props.orgId || loading.value) return
  loading.value = true
  failed.value = false
  try {
    entries.value = await getStatusHistory(props.token, props.orgId)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => props.orgId,
  () => {
    entries.value = []
    void reload()
  },
  { immediate: true },
)

defineExpose({ reload })
</script>

<template>
  <section class="status-history">
    <h2 class="section-label">更新履歴</h2>
    <p v-if="failed" class="result error" role="status">履歴の取得に失敗しました</p>
    <p v-else-if="loading && entries.length === 0" class="hint">読み込み中…</p>
    <p v-else-if="entries.length === 0" class="hint">この団体の更新はまだありません</p>
    <ol v-else class="list">
      <li v-for="(entry, index) in entries" :key="index">
        <time :datetime="new Date(entry.createdAt * 1000).toISOString()">
          {{ formatTime(entry.createdAt) }}
        </time>
        <span :class="['sales', `sales-${entry.sales}`]">{{ SALES_LABELS[entry.sales] }}</span>
        <span class="congestion">
          {{ entry.congestion ? CONGESTION_LABELS[entry.congestion] : '—' }}
        </span>
        <span class="source">{{ SOURCE_LABELS[entry.source] }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.status-history {
  margin-top: 16px;
  padding: 24px 20px 20px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);

  .hint {
    margin-top: 10px;
  }

  .result {
    margin: 10px auto 0;
  }

  .list {
    max-height: 320px;
    margin-top: 12px;
    padding: 0;
    overflow-y: auto;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: 8em minmax(0, 9em) minmax(0, 9em) minmax(0, 1fr);
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border-bottom: 1px solid var(--color-border);
      font-size: 13px;

      &:last-child {
        border-bottom: 0;
      }

      @media (max-width: 560px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        row-gap: 4px;
      }
    }

    time {
      color: var(--color-text-mute);
      font-variant-numeric: tabular-nums;
    }

    .sales {
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--c);
      }

      &.sales-available {
        --c: var(--color-status-good);
      }

      &.sales-partial {
        --c: var(--color-status-warn);
      }

      &.sales-low {
        --c: var(--color-status-bad);
      }

      &.sales-paused {
        --c: var(--color-status-pause);
      }

      &.sales-soldout {
        --c: var(--color-status-soldout);
      }
    }

    .congestion,
    .source {
      color: var(--color-text-mute);
    }

    .source {
      text-align: right;
    }
  }
}
</style>
