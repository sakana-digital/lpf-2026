<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import MenuIcon from '../assets/menu.vue'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import PageTree from './PageTree.vue'

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
    <div v-if="isOpen" class="dropdown">
      <ThemeToggle />
      <LanguageToggle />
      <PageTree />
    </div>
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
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
}
</style>
