<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import CopyIcon from './icons/copy.vue'
import CheckIcon from './icons/check.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const crumbs = computed(() => {
  const prefix = route.meta.locale === 'en' ? '/en' : ''
  const segments = route.path.split('/').filter((s) => s !== 'en' && Boolean(s))
  return segments
    .map((segment, index) => ({
      label: segment,
      to: prefix + '/' + segments.slice(0, index + 1).join('/'),
    }))
    .filter((crumb) => {
      const resolved = router.resolve(crumb.to)
      return (
        resolved.matched.length > 0 && !resolved.matched.some((r) => r.path.includes(':pathMatch'))
      )
    })
})

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyLink() {
  await navigator.clipboard.writeText(window.location.origin + route.fullPath)
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = false), 1500)
}
</script>

<template>
  <div v-if="crumbs.length" class="breadcrumb" aria-label="breadcrumb">
    <div class="crumbs">
      <template v-for="crumb in crumbs" :key="crumb.to">
        <svg
          class="separator"
          width="8"
          height="16"
          viewBox="0 0 8 16"
          fill="none"
          aria-hidden="true"
        >
          <line
            x1="6"
            y1="2"
            x2="2"
            y2="14"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <RouterLink :to="crumb.to" class="crumb">{{ crumb.label }}</RouterLink>
      </template>
    </div>
    <button
      type="button"
      class="copy-button"
      :aria-label="copied ? t('breadcrumb.copied') : t('breadcrumb.copy')"
      @click="copyLink"
    >
      <CheckIcon v-if="copied" />
      <CopyIcon v-else />
    </button>
  </div>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 2px;
  font-size: 0.875rem;
  color: #888;

  .crumbs {
    overflow: hidden;
    min-width: 0;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .separator {
    vertical-align: middle;
  }

  .copy-button {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    margin-left: 6px;
    padding: 4px;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;

    &:hover {
      color: var(--color-heading);
    }
  }
}
</style>
