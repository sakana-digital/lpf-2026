<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ExploreIcon from '@/components/common/icons/explore.vue'
import { useScrolledPast } from '@/composables/useScrolledPast'

const { t, locale } = useI18n()

const explorePath = computed(() => (locale.value === 'en' ? '/en/explore' : '/explore'))

const visible = useScrolledPast(160)
</script>

<template>
  <RouterLink
    class="home-dock"
    :class="{ 'is-visible': visible }"
    :to="explorePath"
    :aria-hidden="!visible"
    :tabindex="visible ? undefined : -1"
  >
    <ExploreIcon />
    <span class="label">{{ t('home.dock.explore') }}</span>
  </RouterLink>
</template>

<style scoped>
.home-dock {
  position: fixed;
  bottom: max(24px, env(safe-area-inset-bottom));
  left: 50%;
  z-index: 150;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 999px;
  background: var(--color-background-soft);
  color: var(--color-heading);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);
  text-decoration: none;
  cursor: pointer;
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
  filter: blur(8px);
  pointer-events: none;
  transition:
    opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.9s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.9s cubic-bezier(0.22, 1, 0.36, 1);

  @media (min-width: 768px) {
    bottom: 40px;
  }

  &.is-visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    filter: blur(0);
    pointer-events: auto;
  }

  &.is-visible:hover {
    background: var(--color-background-mute);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-dock {
    transform: translateX(-50%);
    filter: none;
    transition: opacity 0.3s;

    &.is-visible {
      transform: translateX(-50%);
      filter: none;
    }
  }
}
</style>
