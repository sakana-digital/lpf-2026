<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrganization } from '@/config/organizations'
import { useOrgStatus } from '@/composables/useOrgStatus'
import BookmarkToggle from '@/components/common/BookmarkToggle.vue'
import EventsGrid from './EventsGrid.vue'

const route = useRoute()
const router = useRouter()

const { statuses } = useOrgStatus()

const selectedId = computed(() => {
  const org = route.query.org
  return typeof org === 'string' && getOrganization(org) ? org : undefined
})

function onSelect(id: string | null) {
  router.replace({ query: { ...route.query, org: id ?? undefined } })
}
</script>

<template>
  <div class="events">
    <EventsGrid :selected-id="selectedId" :statuses="statuses" @select="onSelect">
      <template #cell-actions="{ org }">
        <BookmarkToggle v-if="org" :org-id="org.id" />
      </template>
    </EventsGrid>
  </div>
</template>

<style scoped>
.events {
  padding: 24px 16px 48px;
  overflow-x: auto;
}
</style>
