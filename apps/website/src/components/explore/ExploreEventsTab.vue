<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getOrganization } from '@/config/organizations'
import { useOrgStatus } from '@/composables/useOrgStatus'
import { useSelectedOrg } from '@/composables/useSelectedOrg'
import BookmarkToggle from '@/components/bookmarks/BookmarkToggle.vue'
import SegmentedSwitch from '@/components/ui/SegmentedSwitch.vue'
import EventsGrid from './EventsGrid.vue'
import OrgNodeGraph from './OrgNodeGraph.vue'

const route = useRoute()
const router = useRouter()

const { t } = useI18n()
const { statuses } = useOrgStatus()

const views = ['grid', 'graph'] as const
type EventsView = (typeof views)[number]

const view = computed<EventsView>(() => (route.query.view === 'graph' ? 'graph' : 'grid'))

const viewOptions = computed(() =>
  views.map((v) => ({ value: v, label: t(`explore.events.views.${v}`) })),
)

const hintKey = computed(() =>
  view.value === 'graph' ? 'explore.nodes.hint' : 'explore.events.hint',
)

const { selectedId, select } = useSelectedOrg()

function setView(v: EventsView) {
  router.replace({ query: { ...route.query, view: v === 'graph' ? 'graph' : undefined } })
}

function onSelect(id: string | null) {
  void select(id)
}
</script>

<template>
  <div class="events" :class="{ graph: view === 'graph' }">
    <SegmentedSwitch
      class="view-switch"
      :options="viewOptions"
      :model-value="view"
      :aria-label="t('explore.events.viewSwitch')"
      @update:model-value="setView"
    >
      <template #hint>{{ t(hintKey) }}</template>
    </SegmentedSwitch>

    <EventsGrid
      v-if="view === 'grid'"
      :selected-id="selectedId"
      :statuses="statuses"
      @select="onSelect"
    >
      <template #cell-actions="{ org }">
        <BookmarkToggle v-if="org" :org-id="org.id" />
      </template>
    </EventsGrid>
    <OrgNodeGraph v-else :selected-id="selectedId" :statuses="statuses" @select="onSelect" />
  </div>
</template>

<style scoped>
.events {
  .view-switch {
    justify-content: flex-end;
    margin: 24px 16px 0;
  }

  &.graph {
    display: flex;
    flex-direction: column;
    height: calc(100svh - var(--header-height) - var(--page-title-height));

    @media (max-height: 500px) {
      html[data-orientation^='landscape'] & {
        height: calc(100svh - var(--page-title-height));
      }
    }

    .nodes {
      flex: 1;
      min-height: 0;
    }
  }
}
</style>
