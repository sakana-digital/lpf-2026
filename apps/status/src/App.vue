<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { OrgStatus, SubmitWindows } from '@shared/status'
import { ApiError, getMe } from '@/lib/api'
import { resolveToken } from '@/lib/token'
import { classOrgLabel } from '@/lib/orgLabel'
import StatusEditor from '@/components/StatusEditor.vue'
import SubmitWindowEditor from '@/components/SubmitWindowEditor.vue'
import SignageAdminEditor from '@/components/SignageAdminEditor.vue'
import PublicOrgsEditor from '@/components/PublicOrgsEditor.vue'

const token = resolveToken()

type Phase = 'missing' | 'loading' | 'ready' | 'invalid' | 'error'
const phase = ref<Phase>(token ? 'loading' : 'missing')

const isAdmin = ref(false)
const orgs = ref<string[]>([])
const submitWindows = ref<SubmitWindows>({
  day1: { from: null, until: null },
  day2: { from: null, until: null },
})
const orgStatuses = ref(new Map<string, OrgStatus>())
const hiddenOrgs = ref<string[]>([])
const adminTab = ref<'status' | 'window' | 'orgs' | 'signage'>('status')
const statuses = computed(() => [...orgStatuses.value.values()])

const orgLabel = computed(() => (isAdmin.value ? '管理者' : classOrgLabel(orgs.value[0] ?? '')))

onMounted(async () => {
  if (!token) return
  try {
    const me = await getMe(token)
    submitWindows.value = me.windows
    if ('admin' in me) {
      isAdmin.value = true
      orgs.value = me.orgs
      orgStatuses.value = new Map(me.statuses.map((status) => [status.orgId, status]))
      hiddenOrgs.value = me.hiddenOrgs
    } else {
      orgs.value = [me.orgId]
      if (me.status) orgStatuses.value.set(me.orgId, me.status)
    }
    phase.value = 'ready'
  } catch (error) {
    phase.value = error instanceof ApiError && error.status === 401 ? 'invalid' : 'error'
  }
})
</script>

<template>
  <main class="status-app" :class="{ admin: isAdmin }">
    <header>
      <div class="heading">
        <h1>{{ isAdmin ? 'ステータスを管理' : 'ステータスを送信' }}</h1>
        <strong v-if="phase === 'ready'" class="org">{{ orgLabel }}</strong>
      </div>
      <nav v-if="phase === 'ready' && isAdmin" class="admin-tabs" aria-label="管理メニュー">
        <button
          v-for="item in [
            { id: 'status', label: 'ステータス' },
            { id: 'window', label: '受付時間' },
            { id: 'orgs', label: '表示団体' },
            { id: 'signage', label: 'サイネージ' },
          ] as const"
          :key="item.id"
          type="button"
          :class="{ active: adminTab === item.id }"
          @click="adminTab = item.id"
        >
          {{ item.label }}
        </button>
      </nav>
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

    <StatusEditor
      v-else-if="token"
      v-show="!isAdmin || adminTab === 'status'"
      :token="token"
      :admin="isAdmin"
      :orgs="orgs"
      :statuses="statuses"
      :windows="submitWindows"
      @updated="orgStatuses.set($event.orgId, $event)"
    />

    <SubmitWindowEditor
      v-if="phase === 'ready' && isAdmin && token && adminTab === 'window'"
      :token="token"
      :windows="submitWindows"
      @updated="submitWindows = $event"
    />

    <PublicOrgsEditor
      v-if="phase === 'ready' && isAdmin && token && adminTab === 'orgs'"
      :token="token"
      :orgs="orgs"
      :hidden="hiddenOrgs"
      @updated="hiddenOrgs = $event"
    />

    <SignageAdminEditor
      v-if="phase === 'ready' && isAdmin && token && adminTab === 'signage'"
      :token="token"
      :orgs="orgs"
      :statuses="statuses"
    />
  </main>
</template>

<style scoped>
.status-app {
  max-width: 440px;
  margin: 0 auto;
  padding: 32px 20px 56px;

  &.admin {
    max-width: 1180px;
  }

  header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 20px;

    .heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      h1 {
        font-size: 22px;
        letter-spacing: 0.01em;
      }

      .org {
        padding: 4px 14px;
        background: var(--color-accent);
        color: var(--color-on-accent);
        font-size: 14px;
        white-space: nowrap;
      }
    }
  }

  .admin-tabs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin-top: 14px;
    border: 1px solid var(--color-border);

    button {
      padding: 10px 6px;
      border-right: 1px solid var(--color-border);
      color: var(--color-text-mute);
      font-size: 12px;
      cursor: pointer;

      &:last-child {
        border-right: 0;
      }

      &.active {
        background: var(--color-text);
        color: var(--color-background);
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
}
</style>
