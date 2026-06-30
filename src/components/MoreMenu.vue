<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import MoreIcon from '../assets/more.vue'
import ThemeToggle from './ThemeToggle.vue'
import LanguageToggle from './LanguageToggle.vue'
import PageTree from './PageTree.vue'

const { t } = useI18n()
const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div class="more-menu">
    <button
      class="icon-button"
      :class="{ 'is-open': isOpen }"
      :aria-label="t('nav.more')"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <MoreIcon />
    </button>
    <div v-if="isOpen" class="dropdown">
      <ThemeToggle />
      <LanguageToggle />
      <PageTree />
    </div>
  </div>
</template>

<style scoped>
.more-menu {
  position: relative;
  display: flex;

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
