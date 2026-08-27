<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useBookmarks } from '@/stores/bookmarks'
import BookmarksList from './BookmarksList.vue'

const { t } = useI18n()
const { bookmarkIds } = useBookmarks()
</script>

<template>
  <section class="bookmarks-menu" :aria-label="t('bookmarks.title')">
    <div class="head">
      <span class="caption">{{ t('bookmarks.title') }}</span>
      <span v-if="bookmarkIds.length > 0" class="count">{{ bookmarkIds.length }}</span>
    </div>
    <BookmarksList class="list" />
  </section>
</template>

<style scoped>
.bookmarks-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 8px 16px 4px 0;

  .head {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .caption {
    color: var(--color-text-mute);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
  }

  .count {
    color: var(--color-text-mute);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .list {
    align-items: flex-end;
    padding: 4px 0 0;
  }
}
</style>
