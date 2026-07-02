<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import MenuIcon from '../assets/menu.vue'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import PageTree from './PageTree.vue'
import ExternalLinks from './ExternalLinks.vue'
import ProgressiveBlur from './ProgressiveBlur.vue'

const { t } = useI18n()
const isOpen = ref(false)
const rootRef = useTemplateRef<HTMLElement>('rootRef')

function toggle() {
  isOpen.value = !isOpen.value
}

function handleClickOutside(event: MouseEvent) {
  if (isOpen.value && !rootRef.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="rootRef" class="menu-dropdown">
    <button
      class="icon-button"
      :class="{ 'is-open': isOpen }"
      :aria-label="t('nav.menu')"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <MenuIcon :open="isOpen" />
    </button>
    <Transition name="dropdown" :duration="250">
      <div v-if="isOpen" class="dropdown">
        <ProgressiveBlur
          class="dropdown-blur"
          tail="32px"
          :blur="3"
          side-mask="linear-gradient(to right, transparent, black 64px, black calc(100% - 24px), transparent), linear-gradient(to bottom, transparent 9px, black 15px)"
        />
        <div class="dropdown-items">
          <ThemeToggle />
          <LanguageToggle />
          <ExternalLinks />
          <PageTree />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-dropdown {
  position: relative;
  display: flex;

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

    .dropdown-items {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      clip-path: inset(0 0 0% 0);
    }

    .dropdown-blur {
      inset: -52px 0 -32px 0;
      z-index: -1;
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

  :deep(.blur-layer) {
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

  :deep(.blur-layer) {
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

  :deep(.blur-layer) {
    opacity: 0;
  }
}
</style>
