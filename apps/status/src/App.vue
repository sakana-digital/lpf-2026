<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CONGESTION_LEVELS, SALES_STATUSES } from '../../../shared/status'
import type { CongestionLevel, SalesStatus } from '../../../shared/status'
import { ApiError, getMe, updateStatus } from '@/lib/api'
import { resolveToken } from '@/lib/token'
import { classOrgParams } from '@/lib/orgLabel'

const { t, locale } = useI18n()

const token = resolveToken()

type Phase = 'missing' | 'loading' | 'ready' | 'invalid' | 'error'
const phase = ref<Phase>(token ? 'loading' : 'missing')

const orgId = ref('')
const sales = ref<SalesStatus | null>(null)
const congestion = ref<CongestionLevel | null>(null)
const saving = ref(false)
const savedAt = ref<number | null>(null)
const saveFailed = ref(false)

const orgLabel = computed(() => {
  const params = classOrgParams(orgId.value)
  return params ? t('org.class', params) : orgId.value
})

const savedTime = computed(() => {
  if (savedAt.value === null) return ''
  return new Date(savedAt.value * 1000).toLocaleTimeString(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const canSubmit = computed(() => sales.value !== null && congestion.value !== null && !saving.value)

onMounted(async () => {
  if (!token) return
  try {
    const me = await getMe(token)
    orgId.value = me.orgId
    sales.value = me.status?.sales ?? null
    congestion.value = me.status?.congestion ?? null
    phase.value = 'ready'
  } catch (error) {
    phase.value = error instanceof ApiError && error.status === 401 ? 'invalid' : 'error'
  }
})

async function submit() {
  if (!token || sales.value === null || congestion.value === null || saving.value) return
  saving.value = true
  saveFailed.value = false
  savedAt.value = null
  try {
    const updated = await updateStatus(token, sales.value, congestion.value)
    savedAt.value = updated.updatedAt
  } catch {
    saveFailed.value = true
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="status-app">
    <header>
      <h1>{{ t('app.title') }}</h1>
      <p v-if="phase === 'ready'" class="org">{{ orgLabel }}</p>
    </header>

    <p v-if="phase === 'missing'" class="notice">{{ t('auth.missing') }}</p>
    <p v-else-if="phase === 'invalid'" class="notice">{{ t('auth.invalid') }}</p>
    <p v-else-if="phase === 'error'" class="notice">{{ t('form.loadError') }}</p>
    <p v-else-if="phase === 'loading'" class="notice mute">{{ t('form.loading') }}</p>

    <form v-else @submit.prevent="submit">
      <fieldset>
        <legend>{{ t('sales.label') }}</legend>
        <div class="choices">
          <button
            v-for="value in SALES_STATUSES"
            :key="value"
            type="button"
            :class="{ selected: sales === value }"
            :aria-pressed="sales === value"
            @click="sales = value"
          >
            {{ t(`sales.${value}`) }}
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>{{ t('congestion.label') }}</legend>
        <div class="choices">
          <button
            v-for="value in CONGESTION_LEVELS"
            :key="value"
            type="button"
            :class="{ selected: congestion === value }"
            :aria-pressed="congestion === value"
            @click="congestion = value"
          >
            {{ t(`congestion.${value}`) }}
          </button>
        </div>
      </fieldset>

      <button type="submit" class="submit" :disabled="!canSubmit">
        {{ saving ? t('form.saving') : t('form.submit') }}
      </button>

      <p v-if="saveFailed" class="result error" role="status">{{ t('form.error') }}</p>
      <p v-else-if="savedAt !== null" class="result" role="status">
        {{ t('form.saved', { time: savedTime }) }}
      </p>
    </form>
  </main>
</template>

<style scoped>
.status-app {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px 48px;

  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 24px;

    h1 {
      font-size: 20px;
      font-weight: 700;
    }

    .org {
      font-size: 16px;
      font-weight: 500;
      color: var(--color-text-mute);
    }
  }

  .notice {
    padding: 16px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    font-size: 14px;

    &.mute {
      border: none;
      color: var(--color-text-mute);
    }
  }

  fieldset {
    border: none;
    padding: 0;
    margin: 0 0 24px;

    legend {
      padding: 0;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 700;
    }
  }

  .choices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;

    button {
      padding: 14px 4px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: var(--color-background-soft);
      color: var(--color-text);
      font-size: 14px;
      cursor: pointer;

      &.selected {
        border-color: var(--color-accent);
        background: var(--color-accent);
        color: var(--color-on-accent);
        font-weight: 700;
      }
    }
  }

  .submit {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 8px;
    background: var(--color-accent);
    color: var(--color-on-accent);
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .result {
    margin-top: 16px;
    font-size: 14px;
    text-align: center;

    &.error {
      color: oklch(55% 0.2 25);
    }
  }
}
</style>
