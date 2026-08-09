<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Logo from '@/components/common/icons/logo.vue'
import SearchIcon from '@/components/common/icons/search.vue'
import ExploreIcon from '@/components/common/icons/explore.vue'
import Breadcrumb from './Breadcrumb.vue'
import DayBadge from './DayBadge.vue'
import MenuDropdown from './MenuDropdown.vue'
import ProgressiveBlur from './ProgressiveBlur.vue'
import { useSearch } from '@/composables/useSearch'
import { isDirectRootEntrance } from '@/composables/useRootEntrance'

import { computed, onMounted, ref } from 'vue'

const { t, locale } = useI18n()
const { open } = useSearch()

const entrance = ref(false)
onMounted(() => {
  entrance.value = isDirectRootEntrance()
})

const homePath = computed(() => (locale.value === 'en' ? '/en/' : '/'))
const explorePath = computed(() => (locale.value === 'en' ? '/en/explore/' : '/explore/'))
</script>

<template>
  <header class="header" :class="{ 'is-entrance': entrance }">
    <ProgressiveBlur class="header-blur" :blur="3" />
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
        <RouterLink class="icon-button" :to="explorePath" :aria-label="t('nav.explore')">
          <ExploreIcon />
        </RouterLink>
        <MenuDropdown />
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  min-width: 320px;
  height: var(--header-height);

  .header-blur {
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    z-index: -1;

    @media (max-width: 768px) {
      display: none;
    }
  }

  @media (max-height: 500px) {
    html[data-orientation='landscape-left'] &,
    html[data-orientation='landscape-right'] & {
      top: 0;
      bottom: 0;
      left: 0;
      right: auto;
      min-width: 0;
      width: var(--header-height);
      height: auto;
    }

    html[data-orientation='landscape-right'] & {
      left: auto;
      right: 0;
    }
  }
}

.header.is-entrance .global-nav {
  animation: header-reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes header-reveal {
  from {
    opacity: 0;
    transform: translateY(-12px);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .header.is-entrance .global-nav {
    animation: none;
  }
}

.global-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1024px;

  @media (max-height: 500px) {
    html[data-orientation='landscape-left'] &,
    html[data-orientation='landscape-right'] & {
      width: auto;
      max-width: none;
      height: 100%;
    }

    html[data-orientation='landscape-left'] & {
      flex-direction: column-reverse;
    }

    html[data-orientation='landscape-right'] & {
      flex-direction: column;
    }
  }
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 2px;

  .logo {
    flex-shrink: 0;
    margin-left: 16px;
  }

  @media (max-height: 500px) {
    html[data-orientation='landscape-left'] &,
    html[data-orientation='landscape-right'] & {
      flex-direction: column;

      .logo {
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--header-height);
        height: 67px;
        margin: 0;
      }
    }

    html[data-orientation='landscape-left'] & .logo {
      margin-bottom: 8px;
    }

    html[data-orientation='landscape-right'] & .logo {
      margin-top: 8px;
    }
  }
}

.header-breadcrumb .logo :deep(svg) {
  transition: transform 0.25s;
}

html[data-orientation='landscape-left'] .header-breadcrumb :deep(.breadcrumb),
html[data-orientation='landscape-right'] .header-breadcrumb :deep(.breadcrumb) {
  @media (max-height: 500px) {
    display: none;
  }
}

html[data-orientation='landscape-left'] .header-breadcrumb .logo :deep(svg) {
  @media (max-height: 500px) {
    transform: rotate(-90deg);
  }
}

html[data-orientation='landscape-right'] .header-breadcrumb .logo :deep(svg) {
  @media (max-height: 500px) {
    transform: rotate(90deg);
  }
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  height: 48px;

  @media (max-height: 500px) {
    html[data-orientation='landscape-left'] &,
    html[data-orientation='landscape-right'] & {
      height: auto;
    }

    html[data-orientation='landscape-left'] & {
      flex-direction: column-reverse;
    }

    html[data-orientation='landscape-right'] & {
      flex-direction: column;
    }
  }

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

    &.router-link-active {
      color: var(--color-heading);
    }
  }
}
</style>
