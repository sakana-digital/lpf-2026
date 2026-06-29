<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'

const { resolvedTheme, setTheme } = useTheme()

// 現在と逆の Theme を表示
const showSun = computed(() => resolvedTheme.value === 'dark')

let clickTimer: ReturnType<typeof setTimeout> | null = null

function handleClick() {
  if (clickTimer) return
  clickTimer = setTimeout(() => {
    clickTimer = null
    setTheme(resolvedTheme.value === 'dark' ? 'light' : 'dark')
  }, 200)
}

// ダブルクリックでシステム追従
function handleDblClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
  setTheme('system')
}
</script>

<template>
  <button
    class="theme-toggle"
    @click="handleClick"
    @dblclick="handleDblClick"
    :aria-label="showSun ? 'Light' : 'Dark'"
  >
    <svg v-if="showSun" viewBox="0 0 16 16" fill="none">
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
    <svg v-else viewBox="0 0 16 16" fill="none">
      <path
        d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;

  &:hover {
    color: var(--color-heading);
  }

  svg {
    width: 16px;
    height: 16px;
    display: block;
  }
}
</style>
