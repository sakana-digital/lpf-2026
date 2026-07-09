<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TextShuffle from '@/components/common/TextShuffle.vue'

const props = defineProps<{
  titleKey: string
}>()

const { t } = useI18n()
const title = computed(() => t(props.titleKey))
</script>

<template>
  <div class="page-header">
    <h1><TextShuffle :text="title" /></h1>
    <div id="page-header-tabs" class="page-header-tabs" />
  </div>
</template>

<style scoped>
.page-header {
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(1024px, 100%);
  height: var(--page-title-height);
  margin: 0 auto;
  padding: 0 16px;
  gap: 12px;

  @media (max-height: 500px) {
    html[data-orientation='landscape-left'] & {
      top: 0;
      left: var(--header-height);
      right: 0;
      width: auto;
      margin: 0;
    }

    html[data-orientation='landscape-right'] & {
      top: 0;
      left: 0;
      right: var(--header-height);
      width: auto;
      margin: 0;
    }
  }

  h1 {
    overflow: hidden;
    min-width: 0;
    font-size: clamp(1.75rem, 4vw, 2.75rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--color-heading);
  }

  .page-header-tabs {
    display: contents;
  }
}
</style>
