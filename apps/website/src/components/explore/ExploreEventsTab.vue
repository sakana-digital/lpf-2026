<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getOrganization } from '@/config/organizations'
import { useOrgStatus } from '@/composables/useOrgStatus'
import BookmarkToggle from '@/components/common/BookmarkToggle.vue'
import SegmentedSwitch from '@/components/common/SegmentedSwitch.vue'
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

const selectedId = computed(() => {
  const org = route.query.org
  return typeof org === 'string' && getOrganization(org) ? org : undefined
})

function setView(v: EventsView) {
  router.replace({ query: { ...route.query, view: v === 'graph' ? 'graph' : undefined } })
}

function onSelect(id: string | null) {
  router.replace({ query: { ...route.query, org: id ?? undefined } })
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
    />

    <div v-if="view === 'grid'" class="grid-wrap">
      <EventsGrid :selected-id="selectedId" :statuses="statuses" @select="onSelect">
        <template #cell-actions="{ org }">
          <BookmarkToggle v-if="org" :org-id="org.id" />
        </template>
      </EventsGrid>
    </div>
    <OrgNodeGraph v-else :selected-id="selectedId" :statuses="statuses" @select="onSelect" />
  </div>
</template>

<style scoped>
.events {
  .view-switch {
    margin: 24px 16px 0;
  }

  .grid-wrap {
    padding: 24px 16px 48px;
    overflow-x: auto;
  }

  &.graph {
    display: flex;
    flex-direction: column;
    height: calc(100svh - var(--header-height) - var(--page-title-height));

    @media (max-height: 500px) {
      html[data-orientation='landscape-left'] &,
      html[data-orientation='landscape-right'] & {
        height: 100svh;
      }
    }

    .nodes {
      flex: 1;
      min-height: 0;
    }
  }
}
</style>
