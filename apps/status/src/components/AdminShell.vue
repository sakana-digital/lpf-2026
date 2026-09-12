<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { STATUS_ORG_IDS } from '@shared/status'
import type { OrgStatus, SubmitWindows, TestSince } from '@shared/status'
import { useAdminPage } from '@/composables/useAdminPage'
import { classOrgLabel } from '@/lib/orgLabel'
import AppShell from '@/components/AppShell.vue'
import WindowFrame from '@/components/WindowFrame.vue'
import StatusEditor from '@/components/StatusEditor.vue'
import StatusHistory from '@/components/StatusHistory.vue'
import SubmitWindowEditor from '@/components/SubmitWindowEditor.vue'
import TestSessionEditor from '@/components/TestSessionEditor.vue'
import SignageAdminEditor from '@/components/SignageAdminEditor.vue'
import { css, cx } from '@styled/css'
import { control, hint, paneCell, paneGrid, paneTitle, sectionLabel } from '@styled/recipes'

const props = defineProps<{
  token: string
  statuses: OrgStatus[]
  windows: SubmitWindows
  testSince: TestSince
}>()

const emit = defineEmits<{
  status: [OrgStatus]
  windows: [SubmitWindows]
  test: [TestSince]
}>()

const { page, select } = useAdminPage(STATUS_ORG_IDS)

// A pane mounts on its first visit and stays, so switching tabs refetches nothing.
const visited = reactive({ status: false, signage: false })
watch(
  () => page.value.view,
  (view) => (visited[view] = true),
  { immediate: true },
)

const currentStatus = computed(
  () => props.statuses.find((status) => status.orgId === page.value.orgId) ?? null,
)

function pickOrg(event: Event) {
  select({ orgId: (event.target as HTMLSelectElement).value })
}

const styles = {
  tabs: css({ display: 'flex', alignSelf: 'stretch' }),
  tab: css({
    padding: '0 10px',
    borderBottom: '2px solid transparent',
    color: 'textMute',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'color token(durations.base) ease',
    _hover: { color: 'text' },
    '&[aria-current=page]': { borderBottomColor: 'accent', color: 'text' },
  }),
  grid: cx(
    paneGrid(),
    css({
      gridTemplateColumns: 'minmax(340px, 1fr) minmax(0, 2fr)',
      gridTemplateAreas: '"status history"',
      '@container workspace (max-width: 900px)': {
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateAreas: '"status" "history"',
      },
    }),
  ),
  status: css({ gridArea: 'status' }),
  history: css({ gridArea: 'history' }),
  statusPane: css({ display: 'flex', flexDirection: 'column', gap: '16px' }),
  orgField: css({ display: 'grid', gap: '6px' }),
  orgLabel: sectionLabel(),
  // Two sections, each a divider grid of its own, separated by the same 1px line.
  settings: paneGrid(),
  statusSettings: paneGrid({ columns: 'two' }),
  settingsTitle: paneTitle(),
  cell: paneCell(),
  testCell: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'flex-start',
  }),
  testHeading: cx(sectionLabel(), css({ marginBottom: '6px' })),
}
</script>

<template>
  <AppShell header>
    <template #header>
      <nav :class="styles.tabs" aria-label="管理メニュー">
        <button
          type="button"
          :class="styles.tab"
          :aria-current="page.view === 'status' ? 'page' : undefined"
          @click="select({ view: 'status' })"
        >
          ステータス
        </button>
        <button
          type="button"
          :class="styles.tab"
          :aria-current="page.view === 'signage' ? 'page' : undefined"
          @click="select({ view: 'signage' })"
        >
          設定
        </button>
      </nav>
    </template>

    <div v-if="visited.status" v-show="page.view === 'status'" :class="styles.grid">
      <WindowFrame :bordered="false" :class="styles.status">
        <div :class="styles.statusPane">
          <label :class="styles.orgField">
            <span :class="styles.orgLabel">団体</span>
            <select :class="control()" :value="page.orgId" @change="pickOrg">
              <option v-for="id in STATUS_ORG_IDS" :key="id" :value="id">
                {{ classOrgLabel(id) }}
              </option>
            </select>
          </label>
          <StatusEditor
            :token="token"
            admin
            :org-id="page.orgId"
            :status="currentStatus"
            :windows="windows"
            :testing="testSince !== null"
            @updated="emit('status', $event)"
          />
        </div>
      </WindowFrame>

      <WindowFrame :bordered="false" :class="styles.history">
        <StatusHistory :token="token" :org-id="page.orgId" :status="currentStatus" />
      </WindowFrame>
    </div>

    <div v-if="visited.signage" v-show="page.view === 'signage'" :class="styles.settings">
      <SignageAdminEditor :token="token" />

      <div :class="styles.statusSettings">
        <h2 :class="styles.settingsTitle">ステータス</h2>
        <div :class="styles.cell">
          <SubmitWindowEditor
            :token="token"
            :windows="windows"
            @updated="emit('windows', $event)"
          />
        </div>
        <div :class="[styles.cell, styles.testCell]">
          <h3 :class="styles.testHeading">テスト受付</h3>
          <p :class="hint()">準備日に団体が送信を試すための機能です。押すと説明が出ます。</p>
          <TestSessionEditor :token="token" :test-since="testSince" @test="emit('test', $event)" />
        </div>
      </div>
    </div>
  </AppShell>
</template>
