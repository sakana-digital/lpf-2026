<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBookmarks } from '@/composables/useBookmarks'
import BookmarkIcon from '@/components/common/icons/bookmark.vue'
import BookmarksList from './BookmarksList.vue'

const { t } = useI18n()
const { bookmarkIds } = useBookmarks()

const isOpen = ref(false)
</script>

<template>
  <div class="bookmarks-menu">
    <button
      class="icon-button"
      :class="{ 'is-open': isOpen }"
      :aria-label="t('bookmarks.toggle')"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span v-if="bookmarkIds.length > 0" class="count">{{ bookmarkIds.length }}</span>
      <BookmarkIcon :filled="isOpen" />
    </button>
    <BookmarksList v-if="isOpen" class="list" />
  </div>
</template>

<style scoped>
.bookmarks-menu {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: auto;
    min-width: 48px;
    height: 48px;
    border: none;
    border-radius: 24px;
    background: transparent;
    color: var(--color-text-mute);
    cursor: pointer;
    padding: 0 16px;
    transition: color 0.15s;

    &:hover,
    &.is-open {
      color: var(--color-heading);
    }

    .count {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
  }

  .list {
    align-items: flex-end;
    padding: 4px 16px 12px 0;
  }
}
</style>
