<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import IconBookmark from '@/components/icons/IconBookmark.vue'
import ProgressiveBlur from '@/components/ui/ProgressiveBlur.vue'
import { useDisclosure } from '@/composables/useDisclosure'
import { useBookmarks } from '@/stores/bookmarks'
import { getOrganization } from '@/data/organizations'
import { organizationGroupName, organizationProjectName } from '@/lib/organization'
import { localePath } from '@/data/pages'

const { t, locale } = useI18n()
const route = useRoute()
const rootRef = useTemplateRef<HTMLElement>('rootRef')
const { isOpen, close, toggle } = useDisclosure(rootRef)
const { bookmarkIds } = useBookmarks()

watch(
  () => route.fullPath,
  () => close(),
)

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
  <div ref="rootRef" class="bookmarks-dropdown">
    <button
      type="button"
      class="icon-button"
      :class="{ 'is-open': isOpen }"
      :aria-label="t('bookmarks.title')"
      :aria-expanded="isOpen"
      aria-controls="header-bookmarks"
      @click="toggle"
    >
      <IconBookmark :filled="isOpen" />
    </button>
    <Transition name="dropdown" :duration="250">
      <div v-if="isOpen" id="header-bookmarks" class="dropdown">
        <ProgressiveBlur class="dropdown-blur" />
        <div class="dropdown-items">
          <span class="caption">{{ t('bookmarks.count', { count: bookmarkIds.length }) }}</span>
          <ul class="list">
            <li v-for="item in items" :key="item.id">
              <RouterLink class="bookmark-link" :to="item.to">
                <IconBookmark filled />
                <span class="label">{{ item.label }}</span>
                <span v-if="item.name" class="name">{{ item.name }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bookmarks-dropdown {
  position: relative;
  display: flex;
  /* Own stacking context, so the dropdown's negative-z blur stays above the
     page header instead of behind its teleported content */
  z-index: 1;

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;

    &:hover,
    &.is-open {
      color: var(--color-heading);
    }
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    width: max-content;
    max-width: calc(100vw - 32px);

    .dropdown-items {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      padding: 8px 16px 4px 0;
      clip-path: inset(0 0 0% 0);
    }

    .dropdown-blur {
      --progressive-blur-tail: 32px;
      --progressive-blur-veil: var(--progressive-blur-veil-strong);
      --progressive-blur-side-mask:
        linear-gradient(to right, transparent, black 32px, black calc(100% - 32px), transparent),
        linear-gradient(to bottom, transparent 20px, black 52px);

      inset: -52px -32px -32px;
      z-index: -1;
    }
  }

  .caption {
    color: var(--color-text-mute);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .list {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    list-style: none;
    padding: 4px 0 0;
    margin: 0;
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

  @media (max-height: 500px) {
    html[data-orientation='landscape-left'] & .dropdown {
      top: 0;
      left: calc(100% + 4px);
      right: auto;

      .dropdown-blur {
        --progressive-blur-direction: to right;
        --progressive-blur-side-mask:
          linear-gradient(to bottom, transparent, black 32px, black calc(100% - 32px), transparent),
          linear-gradient(to right, transparent 20px, black 52px);

        inset: -32px -32px -32px -52px;
      }
    }

    html[data-orientation='landscape-right'] & .dropdown {
      top: auto;
      bottom: 0;
      right: calc(100% + 4px);
      left: auto;

      .dropdown-blur {
        --progressive-blur-direction: to left;
        --progressive-blur-side-mask:
          linear-gradient(to bottom, transparent, black 32px, black calc(100% - 32px), transparent),
          linear-gradient(to left, transparent 20px, black 52px);

        inset: -32px -52px -32px -32px;
      }
    }
  }
}

.dropdown-enter-active {
  .dropdown-items {
    transition:
      opacity 0.2s ease-out,
      filter 0.22s ease-out,
      clip-path 0.25s ease-out;
  }

  .dropdown-blur :deep(*) {
    transition: opacity 0.25s ease-out;
  }
}

.dropdown-leave-active {
  .dropdown-items {
    transition:
      opacity 0.2s ease-in,
      filter 0.2s ease-in,
      clip-path 0.25s ease-in;
  }

  .dropdown-blur :deep(*) {
    transition: opacity 0.2s ease-in;
  }
}

.dropdown-enter-from,
.dropdown-leave-to {
  .dropdown-items {
    opacity: 0;
    filter: blur(6px);
    clip-path: inset(0 0 100% 0);
  }

  .dropdown-blur :deep(*) {
    opacity: 0;
  }
}
</style>
