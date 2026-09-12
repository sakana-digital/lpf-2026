<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { defaultSubmitWindows } from '@shared/status'
import type { OrgStatus, SubmitWindows, TestSince } from '@shared/status'
import { ApiError, getMe } from '@/lib/api'
import { resolveToken } from '@/lib/token'
import { classOrgLabel } from '@/lib/orgLabel'
import AdminShell from '@/components/AdminShell.vue'
import AppShell from '@/components/AppShell.vue'
import WindowFrame from '@/components/WindowFrame.vue'
import StatusEditor from '@/components/StatusEditor.vue'
import { css, cx } from '@styled/css'
import { hint } from '@styled/recipes'

const token = resolveToken()

type Phase = 'invalid' | 'loading' | 'ready' | 'error'
// A missing token is as actionable as a rejected one: check the URL.
const phase = ref<Phase>(token ? 'loading' : 'invalid')

const isAdmin = ref(false)
// The group this token belongs to; an admin token belongs to none.
const orgId = ref('')
const accepted = ref(true)
const windows = ref<SubmitWindows>(defaultSubmitWindows())
const testSince = ref<TestSince>(null)
const orgStatuses = ref(new Map<string, OrgStatus>())
const statuses = computed(() => [...orgStatuses.value.values()])

const orgStatus = computed(() => orgStatuses.value.get(orgId.value) ?? null)

async function load() {
  if (!token) return
  try {
    const me = await getMe(token)
    windows.value = me.windows
    testSince.value = me.testSince
    if ('admin' in me) {
      isAdmin.value = true
      orgStatuses.value = new Map(me.statuses.map((status) => [status.orgId, status]))
    } else {
      orgId.value = me.orgId
      accepted.value = me.accepted
      orgStatuses.value = new Map(me.status ? [[me.orgId, me.status]] : [])
    }
    phase.value = 'ready'
  } catch (error) {
    phase.value = error instanceof ApiError && error.status === 401 ? 'invalid' : 'error'
  }
}

// Ending a rehearsal rewrites statuses on the server, so the whole snapshot is fetched again.
async function onTest(since: TestSince) {
  testSince.value = since
  if (since === null) await load()
}

onMounted(load)

const styles = {
  notice: css({
    padding: '20px',
    border: '1px solid token(colors.border)',
    background: 'surface',
    fontSize: '14px',
    lineHeight: 1.7,
  }),
  loading: cx(hint(), css({ padding: '20px', fontSize: '14px', textAlign: 'center' })),
}
</script>

<template>
  <AdminShell
    v-if="phase === 'ready' && isAdmin && token"
    :token="token"
    :statuses="statuses"
    :windows="windows"
    :test-since="testSince"
    @status="orgStatuses.set($event.orgId, $event)"
    @windows="windows = $event"
    @test="onTest"
  />

  <AppShell v-else narrow>
    <p v-if="phase === 'invalid'" :class="styles.notice">
      アクセス用 URL が正しくありません。配布された URL からアクセスしてください。
    </p>
    <p v-else-if="phase === 'error'" :class="styles.notice">
      読み込みに失敗しました。ページを再読み込みしてください。
    </p>
    <p v-else-if="phase === 'loading'" :class="styles.loading">読み込み中…</p>

    <WindowFrame v-else-if="token" title="ステータス" :subtitle="classOrgLabel(orgId)">
      <StatusEditor
        :token="token"
        :admin="false"
        :org-id="orgId"
        :status="orgStatus"
        :windows="windows"
        :testing="testSince !== null"
        :accepted="accepted"
        @updated="orgStatuses.set($event.orgId, $event)"
      />
    </WindowFrame>
  </AppShell>
</template>
