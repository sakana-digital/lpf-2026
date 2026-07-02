<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Logo from '../assets/logo.vue'
import SearchIcon from '../assets/search.vue'
import ExploreIcon from '../assets/explore.vue'
import Breadcrumb from './Breadcrumb.vue'
import DayBadge from './DayBadge.vue'
import NavMenu from './NavMenu.vue'
import { useSearch } from '../composables/useSearch'

import { computed } from 'vue'

const { t, locale } = useI18n()
const { open } = useSearch()

const homePath = computed(() => (locale.value === 'en' ? '/en' : '/'))
</script>

<template>
  <header class="header">
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
        <NavMenu />
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
}

.global-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1024px;
  margin: 0 16px;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
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
