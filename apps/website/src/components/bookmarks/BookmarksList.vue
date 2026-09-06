<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBookmarks } from '@/stores/bookmarks'
import { getOrganization } from '@/data/organizations'
import { organizationGroupName, organizationProjectName } from '@/lib/organization'
import IconBookmark from '@/components/icons/IconBookmark.vue'
import { localePath } from '@/data/pages'

const { t, locale } = useI18n()
const { bookmarkIds } = useBookmarks()

const items = computed(() =>
  bookmarkIds.value
    .map((id) => getOrganization(id))
    .filter((org) => org != null)
    .map((org) => ({
      id: org.id,
      label: organizationGroupName(org, locale.value, t),
      name: organizationProjectName(org, locale.value),
      to: {
        path: localePath('/explore/events/', locale.value),
        query: { org: org.id },
      },
    })),
)
</script>

<template>
  <ul class="bookmarks-list">
    <li v-if="items.length === 0" class="empty">{{ t('bookmarks.empty') }}</li>
    <li v-for="item in items" :key="item.id">
      <RouterLink class="bookmark-link" :to="item.to">
        <IconBookmark filled />
        <span class="label">{{ item.label }}</span>
        <span v-if="item.name" class="name">{{ item.name }}</span>
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.bookmarks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  padding: 0;
  margin: 0;

  .empty {
    color: var(--color-text-mute);
    font-size: 12px;
    white-space: nowrap;
  }

  .bookmark-link {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-mute);
    font-size: 13px;
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.15s;

    &:hover {
      color: var(--color-heading);
    }

    .label {
      font-variant-numeric: tabular-nums;
    }

    .name {
      overflow: hidden;
      max-width: 120px;
      font-family: var(--font-text);
      text-overflow: ellipsis;
    }
  }
}
</style>
