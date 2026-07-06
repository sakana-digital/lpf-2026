<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ src?: string; alt: string }>()

const { t } = useI18n()
</script>

<template>
  <div class="org-image">
    <Transition name="slide-diagonal" appear>
      <img v-if="src" :src="src" :alt="alt" loading="lazy" />
      <div v-else class="placeholder">
        <span>{{ t('explore.events.noImage') }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.org-image {
  overflow: hidden;
  flex: 1;
  min-height: 0;

  img,
  .placeholder {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-background-mute);
    color: var(--color-text-mute);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
}

.slide-diagonal-enter-active {
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.3s ease-out;
}

.slide-diagonal-enter-from {
  transform: translate(-32px, -32px) scale(1.06);
  opacity: 0;
}
</style>
