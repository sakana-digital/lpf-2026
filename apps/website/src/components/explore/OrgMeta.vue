<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { organizationPlaceLabel } from '@/lib/organization'
import type { OrgPlace } from '@shared/organizations'

const props = defineProps<{ place?: OrgPlace }>()

const { t, locale } = useI18n()

const placeLabel = computed(() => organizationPlaceLabel(props.place, locale.value, t))
</script>

<template>
  <div class="org-meta">
    <span v-if="placeLabel" class="place">{{ placeLabel }}</span>
    <slot></slot>
  </div>
</template>

<style scoped>
.org-meta {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  /* The 32px controls overflow the row instead of pushing the name down */
  margin: -8px 0;

  .place {
    color: var(--color-text-mute);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
}
</style>
