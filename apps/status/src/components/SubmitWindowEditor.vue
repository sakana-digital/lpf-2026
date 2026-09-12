<script setup lang="ts">
import { computed, reactive } from 'vue'
import { SUBMIT_DAYS, defaultSubmitWindows, parseSubmitWindow } from '@shared/status'
import type { SubmitWindows } from '@shared/status'
import { updateWindows } from '@/lib/api'
import { useSaveState } from '@/composables/useSaveState'
import { fromLocalInput, toLocalInput } from '@/lib/localDateTime'
import { css, cx } from '@styled/css'
import { button, control, hint, resultBadge, sectionLabel } from '@styled/recipes'

const props = defineProps<{
  token: string
  windows: SubmitWindows
}>()

const emit = defineEmits<{ updated: [SubmitWindows] }>()

type Day = (typeof SUBMIT_DAYS)[number]

const DAY_LABELS: Record<Day, string> = { day1: 'Day 1', day2: 'Day 2' }

function toFields(windows: SubmitWindows) {
  return Object.fromEntries(
    SUBMIT_DAYS.map((day) => [
      day,
      { from: toLocalInput(windows[day].from), until: toLocalInput(windows[day].until) },
    ]),
  ) as Record<Day, { from: string; until: string }>
}

const fields = reactive(toFields(props.windows))

const { saving, saved, failed, save: runSave } = useSaveState()

function resetToDefault() {
  Object.assign(fields, toFields(defaultSubmitWindows()))
}

function parseDay(day: Day) {
  return parseSubmitWindow({
    from: fromLocalInput(fields[day].from),
    until: fromLocalInput(fields[day].until),
  })
}

const parsed = computed(() => {
  const day1 = parseDay('day1')
  const day2 = parseDay('day2')
  return day1 && day2 ? { day1, day2 } : null
})

async function save() {
  if (!parsed.value) return
  const { day1, day2 } = parsed.value
  const updated = await runSave(() => updateWindows(props.token, { day1, day2 }))
  if (updated) emit('updated', updated)
}

const styles = {
  root: css({ display: 'flex', flexDirection: 'column' }),
  heading: cx(sectionLabel(), css({ marginBottom: '6px' })),
  day: css({ border: 'none', padding: 0, margin: '12px 0 0' }),
  legend: css({ padding: 0, marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }),
  fields: css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '8px',
  }),
  field: cx(hint(), css({ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 })),
  actions: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: 'auto',
    paddingTop: '14px',
  }),
  result: css({ marginRight: 'auto' }),
}
</script>

<template>
  <section :class="styles.root">
    <h3 :class="styles.heading">受付時間</h3>
    <p :class="hint()">
      団体が送信できる時間です。初期値は開場時間で、両日とも終了が開始より後である必要があります。
    </p>
    <fieldset v-for="day in SUBMIT_DAYS" :key="day" :class="styles.day">
      <legend :class="styles.legend">{{ DAY_LABELS[day] }}</legend>
      <div :class="styles.fields">
        <label :class="styles.field">
          <span>開始</span>
          <input v-model="fields[day].from" :class="control()" type="datetime-local" required />
        </label>
        <label :class="styles.field">
          <span>終了</span>
          <input v-model="fields[day].until" :class="control()" type="datetime-local" required />
        </label>
      </div>
    </fieldset>
    <div :class="styles.actions">
      <p v-if="failed" :class="cx(resultBadge({ tone: 'error' }), styles.result)" role="status">
        保存に失敗しました。
      </p>
      <p v-else-if="saved" :class="cx(resultBadge(), styles.result)" role="status">
        保存しました。
      </p>
      <button
        type="button"
        :class="button({ variant: 'ghost' })"
        :disabled="saving"
        @click="resetToDefault"
      >
        開場時間に戻す
      </button>
      <button
        type="button"
        :class="button({ variant: 'primary' })"
        :disabled="saving || !parsed"
        @click="save"
      >
        {{ saving ? '保存中…' : '時間を保存' }}
      </button>
    </div>
  </section>
</template>
