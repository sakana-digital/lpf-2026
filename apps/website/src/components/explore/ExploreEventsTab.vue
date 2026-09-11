<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { EVENT_GROUPINGS } from '@/lib/eventsGrid'
import type { EventsGrouping } from '@/lib/eventsGrid'
import { useOrgStatus } from '@/stores/orgStatus'
import { useSelectedOrg } from '@/composables/useSelectedOrg'
import BookmarkToggle from '@/components/layout/BookmarkToggle.vue'
import SegmentedSwitch from './SegmentedSwitch.vue'
import EventsGrid from './EventsGrid.vue'

const route = useRoute()
const router = useRouter()

const { t } = useI18n()
const { statuses } = useOrgStatus()

const grouping = computed<EventsGrouping>(() =>
  route.query.by === 'category' ? 'category' : 'group',
)

const groupingOptions = computed(() =>
  EVENT_GROUPINGS.map((value) => ({ value, label: t(`explore.events.groupings.${value}`) })),
)

const { selectedId, select } = useSelectedOrg()

function setGrouping(value: EventsGrouping) {
  router.replace({ query: { ...route.query, by: value === 'category' ? value : undefined } })
}

function onSelect(id: string | null) {
  void select(id)
}
</script>

<template>
  <div class="events">
    <SegmentedSwitch
      class="grouping-switch"
      :options="groupingOptions"
      :model-value="grouping"
      :aria-label="t('explore.events.groupingSwitch')"
      @update:model-value="setGrouping"
    >
      <template #hint>{{ t('explore.events.hint') }}</template>
    </SegmentedSwitch>

    <EventsGrid
      :grouping="grouping"
      :selected-id="selectedId"
      :statuses="statuses"
      @select="onSelect"
    >
      <template #cell-actions="{ org }">
        <BookmarkToggle v-if="org" :org-id="org.id" />
      </template>
    </EventsGrid>
  </div>
</template>

<style scoped>
.events .grouping-switch {
  justify-content: flex-end;
  margin: 24px 16px 0;
}
</style>
