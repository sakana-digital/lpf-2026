<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { scheduleSlots, scheduleVenues } from '@/config/schedule'
import type { ScheduleSlot } from '@/config/schedule'
import { festivalDates, resolveFestivalDay } from '@/config/festival'
import { getOrganization, organizationName } from '@/config/organizations'
import { buildTimeAxis, slotRows } from '@/lib/scheduleGrid'
import { useOrgStatus } from '@/composables/useOrgStatus'
import { useSelectedOrg } from '@/composables/useSelectedOrg'
import BookmarkToggle from '@/components/bookmarks/BookmarkToggle.vue'
import SegmentedSwitch from '@/components/ui/SegmentedSwitch.vue'
import OrgDetail from './OrgDetail.vue'

const { t, locale } = useI18n()
const { statuses } = useOrgStatus()

const days = [1, 2] as const
const day = ref<1 | 2>(resolveFestivalDay() === 2 ? 2 : 1)

const dayOptions = computed(() => days.map((d) => ({ value: d, label: dayLabel(d) })))

const daySlots = computed(() => scheduleSlots.filter((slot) => slot.day === day.value))
const axis = computed(() => buildTimeAxis(daySlots.value))

const { selectedId, toggle } = useSelectedOrg()

function isExpanded(slot: ScheduleSlot): boolean {
  return slot.organizationId != null && slot.organizationId === selectedId.value
}

function slotOrg(slot: ScheduleSlot) {
  return slot.organizationId ? getOrganization(slot.organizationId) : undefined
}

function slotOrgName(slot: ScheduleSlot): string {
  const org = slotOrg(slot)
  return org ? organizationName(org, locale.value) : ''
}

const gridRef = useTemplateRef<HTMLElement>('gridRef')

// 閉じるアニメーション中も .active の高さ指定を維持するための ID
const closingId = ref<string>()

async function onSlotClick(slot: ScheduleSlot) {
  if (!slot.organizationId) return
  const next = slot.organizationId === selectedId.value ? undefined : slot.organizationId
  await toggle(slot.organizationId)
  if (!next) return
  await nextTick()
  gridRef.value
    ?.querySelector('.slot.linked.active')
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

function dayLabel(d: 1 | 2): string {
  const [, month = '', dayNum = ''] = (festivalDates[d - 1] ?? '').split('-')
  return t('explore.schedule.dayLabel', { day: d, date: `${Number(month)}/${Number(dayNum)}` })
}

function slotTitle(slot: ScheduleSlot): string {
  return slot.titleKey ? t(slot.titleKey) : ''
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
    <SegmentedSwitch
      v-model="day"
      class="day-switch"
      :options="dayOptions"
      :aria-label="t('explore.schedule.daySwitch')"
    />

    <p v-if="daySlots.length === 0" class="empty">{{ t('explore.schedule.empty') }}</p>

    <div
      ref="gridRef"
      class="grid"
      :style="{ gridTemplateRows: `auto repeat(${axis.rowCount}, 10px)` }"
      role="group"
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

      <template v-for="slot in daySlots" :key="slot.id">
        <div
          v-if="slot.organizationId"
          class="slot linked"
          :class="{ active: isExpanded(slot) || closingId === slot.organizationId }"
          :style="slotStyle(slot)"
        >
          <button
            type="button"
            class="slot-trigger"
            :aria-expanded="isExpanded(slot)"
            @click="onSlotClick(slot)"
          >
            <span class="slot-title">{{ slotTitle(slot) }}</span>
            <span class="slot-time">{{ slot.start }}–{{ slot.end }}</span>
          </button>
          <Transition
            name="detail"
            @before-leave="closingId = slot.organizationId"
            @after-leave="closingId = undefined"
          >
            <div v-if="isExpanded(slot) && slotOrg(slot)" class="slot-expand">
              <div class="slot-expand-inner">
                <span class="slot-org" :class="{ tbd: !slotOrgName(slot) }">
                  {{ slotOrgName(slot) || t('explore.events.tbd') }}
                </span>
                <OrgDetail :org="slotOrg(slot)!" :status="statuses?.get(slot.organizationId)">
                  <template #actions>
                    <BookmarkToggle :org-id="slot.organizationId" />
                  </template>
                </OrgDetail>
              </div>
            </div>
          </Transition>
        </div>
        <div v-else class="slot" :style="slotStyle(slot)">
          <span class="slot-title">{{ slotTitle(slot) }}</span>
          <span class="slot-time">{{ slot.start }}–{{ slot.end }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.schedule {
  width: min(1024px, 100%);
  margin-inline: auto;
  padding: 24px 16px 48px;

  .day-switch {
    justify-content: flex-end;
    margin-bottom: 24px;
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
      margin: 1px 0;
      padding: 6px 10px;
      border: 1px solid var(--color-text-mute);
      background: var(--color-background);
      overflow: hidden;
      z-index: 1;

      &.linked {
        transition: border-color 0.15s;

        .slot-trigger {
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: stretch;
          padding: 0;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        &:hover {
          border-color: var(--color-heading);
        }

        &.active {
          align-self: start;
          height: max-content;
          min-height: calc(100% - 2px);
          z-index: 2;
          border-color: var(--color-heading);
        }
      }

      .slot-title {
        color: var(--color-heading);
        font-size: 13px;
        line-height: 1.3;
      }

      .slot-time {
        margin-top: 2px;
        color: var(--color-text-mute);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }

      .slot-expand {
        display: grid;
        grid-template-rows: 1fr;
        margin-top: 10px;

        .slot-expand-inner {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
          overflow: hidden;
        }

        .slot-org {
          color: var(--color-text);
          font-size: 12px;

          &.tbd {
            color: var(--color-text-mute);
          }
        }

        &.detail-enter-active {
          transition:
            grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1),
            margin-top 0.3s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.2s ease-out;
        }

        &.detail-leave-active {
          transition:
            grid-template-rows 0.4s cubic-bezier(0.33, 1, 0.68, 1),
            margin-top 0.4s cubic-bezier(0.33, 1, 0.68, 1),
            opacity 0.25s ease-out;
        }

        &.detail-enter-from,
        &.detail-leave-to {
          grid-template-rows: 0fr;
          margin-top: 0;
          opacity: 0;
        }
      }
    }
  }
}
</style>
