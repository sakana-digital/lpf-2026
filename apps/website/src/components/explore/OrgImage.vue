<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ src?: string; alt: string }>()

const { t } = useI18n()

// The frame is 4:3 and an image near that ratio fills it; any other ratio is
// fitted on its long side instead of being cropped, and never enlarged
const FRAME_RATIO = 4 / 3
const RATIO_TOLERANCE = 0.05

const fitted = ref(false)

function onLoad(event: Event) {
  const img = event.target as HTMLImageElement
  const ratio = img.naturalWidth / img.naturalHeight
  fitted.value = Math.abs(ratio / FRAME_RATIO - 1) > RATIO_TOLERANCE
}

watch(
  () => props.src,
  () => (fitted.value = false),
)
</script>

<template>
  <div class="org-image">
    <Transition name="slide-diagonal" appear>
      <img
        v-if="src"
        :src="src"
        :alt="alt"
        :class="{ fitted }"
        loading="lazy"
        decoding="async"
        @load="onLoad"
      />
      <div v-else class="placeholder">
        <span>{{ t('explore.events.noImage') }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.org-image {
  overflow: hidden;
  width: 100%;
  aspect-ratio: 4 / 3;

  img,
  .placeholder {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  img.fitted {
    object-fit: scale-down;
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
