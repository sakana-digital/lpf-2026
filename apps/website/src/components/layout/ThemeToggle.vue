<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/stores/theme'
import type { Theme } from '@/stores/theme'
import IconThemeLight from '@/components/icons/IconThemeLight.vue'
import IconThemeSystem from '@/components/icons/IconThemeSystem.vue'
import IconThemeDark from '@/components/icons/IconThemeDark.vue'

const { t } = useI18n()
const { theme, setTheme } = useTheme()

const options: Theme[] = ['light', 'system', 'dark']
</script>

<template>
  <div class="theme-switch">
    <button
      type="button"
      v-for="opt in options"
      :key="opt"
      class="theme-option"
      :class="{ active: theme === opt }"
      :aria-label="t(`themeToggle.${opt}`)"
      :aria-pressed="theme === opt"
      @click="setTheme(opt)"
    >
      <IconThemeLight v-if="opt === 'light'" />
      <IconThemeSystem v-else-if="opt === 'system'" />
      <IconThemeDark v-else />
    </button>
  </div>
</template>

<style scoped>
.theme-switch {
  display: flex;
  align-items: center;

  .theme-option {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--color-text-mute);
    cursor: pointer;
    padding: 0;

    &.active {
      color: var(--color-heading);
    }

    svg {
      width: 16px;
      height: 16px;
      display: block;
    }
  }
}
</style>
