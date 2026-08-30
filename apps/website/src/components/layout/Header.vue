<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import IconLogo from '@/components/icons/IconLogo.vue'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconExplore from '@/components/icons/IconExplore.vue'
import Breadcrumb from './Breadcrumb.vue'
import PageHeader from './PageHeader.vue'
import DayBadge from './DayBadge.vue'
import MenuDropdown from './MenuDropdown.vue'
import ProgressiveBlur from '@/components/ui/ProgressiveBlur.vue'
import { useSearch } from '@/stores/search'
import { isDirectRootEntrance } from '@/lib/rootEntrance'

import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { isRootPath, localePath } from '@/config/pages'

const route = useRoute()
const { t, locale } = useI18n()
const { open } = useSearch()

const entrance = ref(false)

// Publishes which way the device's physical top edge points as
// html[data-orientation], so that in landscape the header can move to a
// vertical rail on that edge. @media (orientation: landscape) cannot tell the
// two sides apart, so this is the one part CSS alone cannot do.
// Browsers without screen.orientation get no attribute and keep the top header.
function applyOrientation() {
  const angle = screen.orientation.angle
  document.documentElement.setAttribute(
    'data-orientation',
    angle === 90 ? 'landscape-left' : angle === 270 ? 'landscape-right' : 'portrait',
  )
}

onMounted(() => {
  entrance.value = isDirectRootEntrance()
  if (!screen.orientation) return
  applyOrientation()
  screen.orientation.addEventListener('change', applyOrientation)
})

onBeforeUnmount(() => {
  screen.orientation?.removeEventListener('change', applyOrientation)
})

const pageTitleKey = computed(() => (isRootPath(route.path) ? undefined : route.meta.pageTitle))

watchEffect(() => {
  document.documentElement.toggleAttribute('data-page-header', !!pageTitleKey.value)
})

const homePath = computed(() => localePath('/', locale.value))
const explorePath = computed(() => localePath('/explore/', locale.value))
</script>

<template>
  <header class="header" :class="{ 'is-entrance': entrance, 'has-page-header': pageTitleKey }">
    <ProgressiveBlur class="header-blur" :blur="3" />
    <PageHeader v-if="pageTitleKey" :title-key="pageTitleKey" />
    <nav class="global-nav">
      <div class="header-breadcrumb">
        <RouterLink :to="homePath" class="logo"><IconLogo /></RouterLink>
        <Breadcrumb />
      </div>
      <div class="header-actions">
        <DayBadge />
        <button type="button" class="icon-button" :aria-label="t('nav.search')" @click="open">
          <IconSearch />
        </button>
        <RouterLink class="icon-button" :to="explorePath" :aria-label="t('nav.explore')">
          <IconExplore />
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
    height: calc(var(--header-height) + 16px);
    z-index: -1;

    @media (max-width: 768px) {
      display: none;
    }
  }

  &.has-page-header .header-blur {
    height: calc(var(--header-height) + var(--page-title-height) + 16px);

    @media (max-height: 500px) {
      html[data-orientation^='landscape'] & {
        height: calc(var(--header-height) + 16px);
      }
    }
  }

  @media (max-height: 500px) {
    html[data-orientation^='landscape'] & {
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
    html[data-orientation^='landscape'] & {
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
    html[data-orientation^='landscape'] & {
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

html[data-orientation^='landscape'] .header-breadcrumb :deep(.breadcrumb) {
  @media (max-height: 500px) {
    display: none;
  }
}

html[data-orientation^='landscape'] .header-breadcrumb .logo :deep(svg) {
  @media (max-height: 500px) {
    /* Wider than the rail before the rotation, but it fits after it. Shrinking
       changes the plate's aspect ratio and shrinks the mark inside with it */
    flex-shrink: 0;
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
    html[data-orientation^='landscape'] & {
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
