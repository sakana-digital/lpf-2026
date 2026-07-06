<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBookmarks } from '@/composables/useBookmarks'
import BookmarksList from './BookmarksList.vue'

const { t } = useI18n()
const { bookmarkIds } = useBookmarks()

const hasBookmarks = computed(() => bookmarkIds.value.length > 0)
</script>

<template>
  <aside v-if="hasBookmarks" class="bookmarks-sidebar" :aria-label="t('bookmarks.title')">
    <span class="caption">{{ t('bookmarks.title') }}</span>
    <BookmarksList />
  </aside>
</template>

<style scoped>
.bookmarks-sidebar {
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: none;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  width: calc((100vw - min(1024px, 100vw)) / 2);
  padding: 0 0 48px 24px;

  @media (min-width: 1440px) {
    display: flex;
  }

  .caption {
    color: var(--color-text-mute);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
  }
}
</style>
