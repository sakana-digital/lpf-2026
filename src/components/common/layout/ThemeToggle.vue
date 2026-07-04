<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import type { Theme } from '@/composables/useTheme'

const { t } = useI18n()
const { theme, setTheme } = useTheme()

const options: Theme[] = ['light', 'system', 'dark']
</script>

<template>
  <div class="theme-switch">
    <button
      v-for="opt in options"
      :key="opt"
      class="theme-option"
      :class="{ active: theme === opt }"
      :aria-label="t(`themeToggle.${opt}`)"
      :aria-pressed="theme === opt"
      @click="setTheme(opt)"
    >
      <svg v-if="opt === 'light'" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.2" />
        <line
          x1="8"
          y1="1"
          x2="8"
          y2="3"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <line
          x1="8"
          y1="13"
          x2="8"
          y2="15"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <line
          x1="1"
          y1="8"
          x2="3"
          y2="8"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <line
          x1="13"
          y1="8"
          x2="15"
          y2="8"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <line
          x1="2.93"
          y1="2.93"
          x2="4.34"
          y2="4.34"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <line
          x1="11.66"
          y1="11.66"
          x2="13.07"
          y2="13.07"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <line
          x1="13.07"
          y1="2.93"
          x2="11.66"
          y2="4.34"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
        <line
          x1="4.34"
          y1="11.66"
          x2="2.93"
          y2="13.07"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else-if="opt === 'system'" viewBox="0 0 16 16" fill="none">
        <rect
          x="1.5"
          y="2.5"
          width="13"
          height="9"
          rx="1"
          stroke="currentColor"
          stroke-width="1.2"
        />
        <line x1="8" y1="11.5" x2="8" y2="14" stroke="currentColor" stroke-width="1.2" />
        <line
          x1="5.5"
          y1="14"
          x2="10.5"
          y2="14"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </svg>
      <svg v-else viewBox="0 0 16 16" fill="none">
        <path
          d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>
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
