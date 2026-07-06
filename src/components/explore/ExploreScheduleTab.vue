<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { scheduleSlots, scheduleVenues } from '@/config/schedule'
import type { ScheduleSlot } from '@/config/schedule'
import { festivalDates, resolveFestivalDay } from '@/config/festival'
import { buildTimeAxis, slotRows } from '@/lib/scheduleGrid'

const { t } = useI18n()

const days = [1, 2] as const
const day = ref<1 | 2>(resolveFestivalDay() === 2 ? 2 : 1)

const daySlots = computed(() => scheduleSlots.filter((slot) => slot.day === day.value))
const axis = computed(() => buildTimeAxis(daySlots.value))

function dayLabel(d: 1 | 2): string {
  const [, month = '', dayNum = ''] = (festivalDates[d - 1] ?? '').split('-')
  return t('explore.schedule.dayLabel', { day: d, date: `${Number(month)}/${Number(dayNum)}` })
}

function slotTitle(slot: ScheduleSlot): string {
  return slot.titleKey ? t(slot.titleKey) : (slot.title ?? '')
}

function slotStyle(slot: ScheduleSlot) {
  const rows = slotRows(slot, axis.value)
  return {
    gridColumn: scheduleVenues.indexOf(slot.venue) + 2,
    gridRow: `${rows.start + 1} / ${rows.end + 1}`,
  }
}
</script>

<template>
  <div class="schedule">
    <div class="day-switch" role="group" :aria-label="t('explore.schedule.daySwitch')">
      <button
        v-for="d in days"
        :key="d"
        :class="{ active: day === d }"
        :aria-pressed="day === d"
        @click="day = d"
      >
        {{ dayLabel(d) }}
      </button>
    </div>

    <p v-if="daySlots.length === 0" class="empty">{{ t('explore.schedule.empty') }}</p>

    <div
      class="grid"
      :style="{ gridTemplateRows: `auto repeat(${axis.rowCount}, 10px)` }"
      role="table"
      :aria-label="t('explore.tabs.schedule')"
    >
      <div
        v-for="(venue, i) in scheduleVenues"
        :key="venue"
        class="venue-head"
        :style="{ gridColumn: i + 2 }"
      >
        {{ t(`explore.schedule.venues.${venue}`) }}
      </div>

      <template v-for="mark in axis.hourMarks" :key="mark.row">
        <span class="time-label" :style="{ gridRow: mark.row + 1 }">{{ mark.label }}</span>
        <span class="rule" :style="{ gridRow: mark.row + 1 }" aria-hidden="true"></span>
      </template>

      <div v-for="slot in daySlots" :key="slot.id" class="slot" :style="slotStyle(slot)">
        <span class="slot-title">{{ slotTitle(slot) }}</span>
        <span class="slot-time">{{ slot.start }}–{{ slot.end }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule {
  padding: 24px 0 48px;

  .day-switch {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;

    button {
      padding: 6px 16px;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s,
        border-color 0.15s;

      &:hover {
        border-color: var(--color-border-hover);
        color: var(--color-heading);
      }

      &.active {
        background: var(--color-heading);
        border-color: var(--color-heading);
        color: var(--color-background);
      }
    }
  }

  .empty {
    margin-bottom: 16px;
    color: var(--color-text-mute);
    font-size: 13px;
  }

  .grid {
    display: grid;
    grid-template-columns: 44px repeat(2, minmax(0, 1fr));
    column-gap: 8px;

    .venue-head {
      grid-row: 1;
      margin-bottom: 8px;
      padding: 6px 10px;
      background: var(--color-heading);
      color: var(--color-background);
      font-size: 13px;
      font-weight: 500;
      text-align: center;
    }

    .time-label {
      grid-column: 1;
      justify-self: end;
      transform: translateY(-50%);
      padding-right: 4px;
      color: var(--color-text-mute);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }

    .rule {
      grid-column: 2 / -1;
      align-self: start;
      border-top: 1px solid var(--color-border);
    }

    .slot {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin: 1px 0;
      padding: 6px 10px;
      border: 1px solid var(--color-text-mute);
      background: var(--color-background);
      overflow: hidden;
      z-index: 1;

      .slot-title {
        color: var(--color-heading);
        font-size: 13px;
        line-height: 1.3;
      }

      .slot-time {
        color: var(--color-text-mute);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
    }
  }
}
</style>
