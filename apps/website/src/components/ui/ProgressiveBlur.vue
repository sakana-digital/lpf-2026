<script setup lang="ts">
import { computed } from 'vue'

const { layers = 6, blur = 16 } = defineProps<{
  /** Number of backdrop layers; the radius halves from one to the next */
  layers?: number
  /** Radius of the strongest layer in px */
  blur?: number
}>()

// Geometry comes from CSS so the parent can flip it per media query:
// --progressive-blur-direction  which way the blur fades out (default: to bottom)
// --progressive-blur-tail       length of the falloff at that end (default: 100%)
// --progressive-blur-side-mask  extra mask layers intersected with every layer
// --progressive-blur-veil       tint drawn over the blur, fading along the tail
const direction = 'var(--progressive-blur-direction, to bottom)'
const sideMask = 'var(--progressive-blur-side-mask, linear-gradient(black, black))'

// Position along the tail: 0 is where the falloff starts, 1 is the fading edge
function at(t: number) {
  const rest = Math.round((1 - t) * 1e4) / 1e4
  return rest === 0 ? '100%' : `calc(100% - var(--progressive-blur-tail, 100%) * ${rest})`
}

// The masks must sit on the blurring elements themselves: a mask on an ancestor
// turns it into a backdrop root and the layers stop seeing the page behind
function masked(stops: string) {
  return {
    maskImage: `linear-gradient(${direction}, ${stops}), ${sideMask}`,
    maskComposite: 'intersect',
  }
}

// Each layer owns one band of the tail and cross-fades with its neighbours, so
// the radius steps down smoothly instead of the layers merely thinning out
const layerStyles = computed(() =>
  Array.from({ length: layers }, (_, i) => {
    const radius = blur / 2 ** i
    const stops = [
      i > 0 && `transparent ${at((i - 1) / layers)}`,
      `black ${at(i / layers)}`,
      `black ${at((i + 1) / layers)}`,
      `transparent ${at((i + 2) / layers)}`,
    ].filter(Boolean)
    return {
      backdropFilter: `blur(${radius}px)`,
      WebkitBackdropFilter: `blur(${radius}px)`,
      ...masked(stops.join(', ')),
    }
  }),
)

const veilStyle = masked(`black ${at(0)}, transparent ${at(1)}`)
</script>

<template>
  <div class="progressive-blur" aria-hidden="true">
    <div v-for="(style, i) in layerStyles" :key="i" class="layer" :style="style" />
    <div class="veil" :style="veilStyle" />
  </div>
</template>

<style scoped>
.progressive-blur {
  position: absolute;
  pointer-events: none;

  > * {
    position: absolute;
    inset: 0;
  }

  .veil {
    background: var(--progressive-blur-veil, transparent);
  }
}
</style>
