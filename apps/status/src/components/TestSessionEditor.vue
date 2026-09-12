<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TestSince } from '@shared/status'
import { startTest, stopTest } from '@/lib/api'
import { formatTime } from '@/lib/historyChart'
import { useSaveState } from '@/composables/useSaveState'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { statusDot } from '@/styles/status'
import { css, cx } from '@styled/css'
import { button, resultBadge } from '@styled/recipes'

const props = defineProps<{
  token: string
  testSince: TestSince
}>()

const emit = defineEmits<{ test: [TestSince] }>()

const { saving, failed, save } = useSaveState()
const confirming = ref(false)

const running = computed(() => props.testSince !== null)

const startedLabel = computed(() => {
  if (props.testSince === null) return ''
  return formatTime(props.testSince)
})

const START_MESSAGE = [
  'テスト受付を開始しますか？',
  '',
  '準備日に団体が送信を試すための機能です。',
  '・団体は文化祭時間外でも送信できます。',
  '・テスト中の送信と履歴は本番とは別に記録し、本番の値は表示しません。',
  '・終了するとテスト分だけを削除します。',
].join('\n')

const stopMessage = computed(() =>
  [
    'テスト受付を終了しますか？',
    '',
    `${startedLabel.value} 以降にテストで送信されたステータスと更新履歴を削除します。本番のデータには影響しません。`,
  ].join('\n'),
)

async function confirm() {
  confirming.value = false
  const result = await save(() => (running.value ? stopTest : startTest)(props.token))
  if (result) emit('test', result.testSince)
}

const styles = {
  root: css({ display: 'flex', alignItems: 'center', gap: '10px' }),
  live: cx(statusDot({ tone: 'good' }), css({ _before: { background: 'currentColor' } })),
}
</script>

<template>
  <div :class="styles.root">
    <p v-if="failed" :class="resultBadge({ tone: 'error' })" role="status">操作に失敗しました。</p>
    <button
      type="button"
      :class="button({ variant: running ? 'primary' : 'outline', size: 'sm' })"
      :disabled="saving"
      @click="confirming = true"
    >
      <span v-if="running" :class="styles.live">テスト受付中</span>
      <template v-else>テスト受付</template>
    </button>

    <ConfirmDialog
      :open="confirming"
      :message="running ? stopMessage : START_MESSAGE"
      :confirm-label="running ? '終了して削除' : '開始する'"
      :tone="running ? 'danger' : 'primary'"
      @confirm="confirm"
      @cancel="confirming = false"
    />
  </div>
</template>
