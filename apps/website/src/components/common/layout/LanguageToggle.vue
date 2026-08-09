<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { locale } = useI18n()

// /en プレフィックスを除いた ja 用パス
const jaPath = computed(() => route.path.replace(/^\/en(?=\/|$)/, '') || '/')
const enPath = computed(() => `/en${jaPath.value}`)
</script>

<template>
  <div class="language-toggle">
    <RouterLink :to="jaPath" class="lang" :class="{ active: locale === 'ja' }">ja</RouterLink>
    <RouterLink :to="enPath" class="lang" :class="{ active: locale === 'en' }">en</RouterLink>
  </div>
</template>

<style scoped>
.language-toggle {
  display: flex;
  align-items: center;
  font-size: 12px;
  text-transform: uppercase;

  .lang {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    color: var(--color-text-mute);
    text-decoration: none;

    &.active {
      color: var(--color-heading);
    }
  }
}
</style>
