<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTheme, type Theme } from '../composables/useTheme'

const { theme, setTheme } = useTheme()
const isOpen = ref(false)

const themeOffset = computed(() => ({ system: '0px', light: '-32px', dark: '-64px' })[theme.value])

function handleClick(t: Theme) {
  if (t === theme.value) {
    isOpen.value = !isOpen.value
  } else {
    setTheme(t)
    isOpen.value = false
  }
}
</script>

<template>
  <div
    class="theme-toggle"
    :class="{ 'is-open': isOpen }"
    :style="{ '--theme-offset': themeOffset }"
  >
    <div class="theme-items">
      <button
        class="item"
        :class="{ active: theme === 'system' }"
        @click="handleClick('system')"
        aria-label="System"
      >
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2Z" stroke="currentColor" stroke-width="1.2" />
          <path d="M8 2a6 6 0 0 1 0 12V2Z" fill="currentColor" />
        </svg>
      </button>
      <button
        class="item"
        :class="{ active: theme === 'light' }"
        @click="handleClick('light')"
        aria-label="Light"
      >
        <svg viewBox="0 0 16 16" fill="none">
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
      </button>
      <button
        class="item"
        :class="{ active: theme === 'dark' }"
        @click="handleClick('dark')"
        aria-label="Dark"
      >
        <svg viewBox="0 0 16 16" fill="none">
          <path
            d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-toggle {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  box-shadow: 0 0 0 1px var(--color-border);
  overflow: hidden;
  transition:
    height 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s;
}

.theme-items {
  display: flex;
  flex-direction: column;
  transform: translateY(var(--theme-offset, 0px));
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;

  &::before {
    content: '';
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    background-color: transparent;
    transition: background-color 0.15s;
  }

  &:hover {
    color: var(--color-heading);
  }

  svg {
    position: relative;
    z-index: 1;
    width: 16px;
    height: 16px;
    display: block;
  }
}

@media (hover: hover) {
  .theme-toggle:hover {
    height: 96px;

    .theme-items {
      transform: translateY(0);
    }

    .item.active {
      color: var(--color-background-soft);

      &::before {
        background-color: var(--color-heading);
      }
    }
  }
}
</style>
