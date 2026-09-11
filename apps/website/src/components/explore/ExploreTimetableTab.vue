<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { localized } from '@shared/locale'
import { daySlots, festivalDates, slotDisplayName } from '@shared/timetable'
import type { FestivalDay, TimetableSlot } from '@shared/timetable'
import { venueLabels, venues } from '@shared/venues'
import { resolveFestivalDay } from '@/lib/festival'
import { getOrganization } from '@/data/organizations'
import type { Organization } from '@/data/organizations'
import {
  organizationGroupName,
  organizationImageSrc,
  organizationProjectName,
} from '@/lib/organization'
import { buildTimeAxis, ROW_HEIGHT, slotRows } from '@/lib/timetableGrid'
import { useOrgStatus } from '@/stores/orgStatus'
import { useSelectedOrg } from '@/composables/useSelectedOrg'
import BookmarkToggle from '@/components/layout/BookmarkToggle.vue'
import SegmentedSwitch from './SegmentedSwitch.vue'
import OrgBackdrop from './OrgBackdrop.vue'
import OrgDetail from './OrgDetail.vue'
import OrgMeta from './OrgMeta.vue'

const route = useRoute()
const router = useRouter()

const { t, locale } = useI18n()
const { statuses } = useOrgStatus()

const days = [1, 2] as const
const defaultDay: FestivalDay = resolveFestivalDay() === 2 ? 2 : 1

// Kept in `?day=` like the grouping, so it survives a tab switch
const day = computed<FestivalDay>(() =>
  route.query.day === '2' ? 2 : route.query.day === '1' ? 1 : defaultDay,
)

function setDay(value: FestivalDay) {
  router.replace({
    query: { ...route.query, day: value === defaultDay ? undefined : String(value) },
  })
}

const dayOptions = computed(() => days.map((d) => ({ value: d, label: dayLabel(d) })))

const slots = computed(() => daySlots(day.value))
const axis = computed(() => buildTimeAxis(slots.value))

const entries = computed(() =>
  slots.value.map((slot) => {
    const org = slot.organizationId ? getOrganization(slot.organizationId) : undefined
    return { slot, org, thumb: org && organizationImageSrc(org, 160) }
  }),
)

const { selectedId, toggle } = useSelectedOrg()

function isExpanded(slot: TimetableSlot): boolean {
  return slot.organizationId != null && slot.organizationId === selectedId.value
}

const gridRef = useTemplateRef<HTMLElement>('gridRef')

// Keeps the .active height applied while the closing animation runs
const closingId = ref<string>()

async function onSlotClick(slot: TimetableSlot) {
  if (!slot.organizationId) return
  const next = slot.organizationId === selectedId.value ? undefined : slot.organizationId
  await toggle(slot.organizationId)
  if (!next) return
  await nextTick()
  gridRef.value
    ?.querySelector('.slot.linked.active')
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
}

function dayLabel(d: FestivalDay): string {
  const [, month = '', dayNum = ''] = (festivalDates[d - 1] ?? '').split('-')
  return t('explore.timetable.dayLabel', { day: d, date: `${Number(month)}/${Number(dayNum)}` })
}

function slotTitle(slot: TimetableSlot): string {
  return slotDisplayName(slot, locale.value)
}

// The slot's own title wins over the group's project; an act billed under the
// group's own name is not repeated
function slotHead(slot: TimetableSlot, org: Organization): string {
  const group = organizationGroupName(org, locale.value, t)
  const project = localized(slot.title, locale.value) || organizationProjectName(org, locale.value)
  return project && project !== group ? t('explore.timetable.slotHead', { group, project }) : group
}

function slotStyle(slot: TimetableSlot) {
  const rows = slotRows(slot, axis.value)
  return {
    gridColumn: venues.indexOf(slot.venue) + 2,
    gridRow: `${rows.start + 1} / ${rows.end + 1}`,
  }
}
</script>

<template>
  <div class="timetable">
    <SegmentedSwitch
      class="day-switch"
      :options="dayOptions"
      :model-value="day"
      :aria-label="t('explore.timetable.daySwitch')"
      @update:model-value="setDay"
    />

    <p v-if="slots.length === 0" class="empty">{{ t('explore.timetable.empty') }}</p>

    <div
      ref="gridRef"
      class="grid"
      :style="{ gridTemplateRows: `auto repeat(${axis.rowCount}, ${ROW_HEIGHT}px)` }"
      role="group"
      :aria-label="t('explore.tabs.timetable')"
    >
      <div
        v-for="(venue, i) in venues"
        :key="venue"
        class="venue-head"
        :style="{ gridColumn: i + 2 }"
      >
        {{ localized(venueLabels[venue], locale) }}
      </div>

      <template v-for="mark in axis.halfHourMarks" :key="mark.row">
        <span class="time-label" :style="{ gridRow: mark.row + 1 }">{{ mark.label }}</span>
        <span class="rule" :style="{ gridRow: mark.row + 1 }" aria-hidden="true"></span>
      </template>

      <template v-for="{ slot, org, thumb } in entries" :key="slot.id">
        <div
          v-if="org"
          class="slot linked"
          :class="{ active: isExpanded(slot) || closingId === org.id }"
          :style="slotStyle(slot)"
        >
          <div class="slot-head">
            <button
              type="button"
              class="slot-trigger"
              :aria-expanded="isExpanded(slot)"
              @click="onSlotClick(slot)"
            >
              <span class="slot-title">{{ slotHead(slot, org) }}</span>
              <span class="slot-time">{{ slot.start }}–{{ slot.end }}</span>
            </button>
            <OrgMeta :place="org.place">
              <BookmarkToggle :org-id="org.id" />
            </OrgMeta>
          </div>
          <Transition
            name="detail"
            @before-leave="closingId = org.id"
            @after-leave="closingId = undefined"
          >
            <div v-if="isExpanded(slot)" class="slot-expand">
              <OrgDetail class="slot-expand-inner" :org="org" :status="statuses?.get(org.id)" />
            </div>
          </Transition>
          <OrgBackdrop v-if="thumb" :src="thumb" />
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
.timetable {
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
      position: relative;
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

        .slot-head {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          min-width: 0;
        }

        .slot-trigger {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          min-width: 0;
          padding: 0;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;

          /* Stretch the hit area over the whole slot */
          &::after {
            content: '';
            position: absolute;
            inset: 0;
          }
        }

        &:hover {
          border-color: var(--color-heading);
        }

        &.active {
          --backdrop-blur: 28px;

          align-self: start;
          height: max-content;
          min-height: calc(100% - 2px);
          z-index: 2;
          border-color: var(--color-heading);
        }
      }

      .slot-title {
        color: var(--color-heading);
        font-size: 12px;
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
          overflow: hidden;
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

    /* Only the controls in the detail sit above that hit area */
    .slot :deep(.org-detail :is(a, button)) {
      position: relative;
    }
  }
}
</style>
