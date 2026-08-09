<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useBookmarks } from '@/composables/useBookmarks'
import BookmarkIcon from '@/components/common/icons/bookmark.vue'

const props = defineProps<{ orgId: string }>()

const { t } = useI18n()
const { isBookmarked, toggleBookmark } = useBookmarks()
</script>

<template>
  <button
    class="bookmark-toggle"
    :class="{ active: isBookmarked(orgId) }"
    :aria-label="isBookmarked(orgId) ? t('bookmarks.remove') : t('bookmarks.add')"
    :aria-pressed="isBookmarked(orgId)"
    @click.stop="toggleBookmark(props.orgId)"
  >
    <BookmarkIcon :filled="isBookmarked(orgId)" />
  </button>
</template>

<style scoped>
.bookmark-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-mute);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;

  &:hover,
  &.active {
    color: var(--color-heading);
  }
}
</style>
