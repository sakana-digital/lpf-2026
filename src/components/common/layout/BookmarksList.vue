<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBookmarks } from '@/composables/useBookmarks'
import { getOrganization, organizationName } from '@/config/organizations'
import BookmarkIcon from '@/components/common/icons/bookmark.vue'

const { t, locale } = useI18n()
const { bookmarkIds } = useBookmarks()

const items = computed(() =>
  bookmarkIds.value
    .map((id) => getOrganization(id))
    .filter((org) => org != null)
    .map((org) => ({
      id: org.id,
      label:
        org.kind === 'class'
          ? t('explore.events.classLabel', { grade: org.grade, classNo: org.classNo })
          : t('explore.events.clubHeader'),
      name: organizationName(org, locale.value),
      to: {
        path: `${locale.value === 'en' ? '/en' : ''}/explore/events`,
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
        <BookmarkIcon filled />
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
      text-overflow: ellipsis;
    }
  }
}
</style>
