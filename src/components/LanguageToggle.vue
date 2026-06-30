<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { locale } = useI18n()

// /en プレフィックスを除いた ja 用パス
const jaPath = computed(() => route.path.replace(/^\/en(?=\/|$)/, '') || '/')
const enPath = computed(() => (jaPath.value === '/' ? '/en' : `/en${jaPath.value}`))
</script>

<template>
  <div class="language-toggle">
    <RouterLink :to="jaPath" class="lang" :class="{ active: locale === 'ja' }">ja</RouterLink>
    <svg class="slash" viewBox="0 0 12 16" fill="none" aria-hidden="true">
      <line
        x1="8"
        y1="2"
        x2="4"
        y2="14"
        stroke="currentColor"
        stroke-width="1.2"
        stroke-linecap="round"
      />
    </svg>
    <RouterLink :to="enPath" class="lang" :class="{ active: locale === 'en' }">en</RouterLink>
  </div>
</template>

<style scoped>
.language-toggle {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  text-transform: uppercase;

  .lang {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: var(--color-text-mute);
    text-decoration: none;

    &.active {
      color: var(--color-heading);
      font-weight: 700;
    }
  }

  /* スラッシュはグリッドに含めず中央に重ねる */
  .slash {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 16px;
    color: var(--color-border-hover);
    pointer-events: none;
  }
}
</style>
