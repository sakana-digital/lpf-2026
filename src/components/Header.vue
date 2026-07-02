<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Logo from '../assets/logo.vue'
import SearchIcon from '../assets/search.vue'
import ExploreIcon from '../assets/explore.vue'
import Breadcrumb from './Breadcrumb.vue'
import DayBadge from './DayBadge.vue'
import MenuDropdown from './MenuDropdown.vue'
import ProgressiveBlur from './ProgressiveBlur.vue'
import { useSearch } from '../composables/useSearch'

import { computed } from 'vue'

const { t, locale } = useI18n()
const { open } = useSearch()
const route = useRoute()

const homePath = computed(() => (locale.value === 'en' ? '/en' : '/'))
const isRoot = computed(() => ['/', '/en', '/en/'].includes(route.path))
</script>

<template>
  <header class="header">
    <ProgressiveBlur v-if="!isRoot" class="header-blur" :blur="3" />
    <nav class="global-nav">
      <div class="header-breadcrumb">
        <RouterLink :to="homePath" class="logo"><Logo /></RouterLink>
        <Breadcrumb />
      </div>
      <div class="header-actions">
        <DayBadge />
        <button class="icon-button" :aria-label="t('nav.search')" @click="open">
          <SearchIcon />
        </button>
        <button class="icon-button" :aria-label="t('nav.explore')">
          <ExploreIcon />
        </button>
        <MenuDropdown />
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  grid-area: header;
  height: 48px;

  .header-blur {
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    z-index: -1;
  }
}

.global-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1024px;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  height: 48px;

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

    &:hover {
      color: var(--color-heading);
    }
  }
}
</style>
