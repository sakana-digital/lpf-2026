<script setup lang="ts">
const {
  layers = 3,
  blur = 4,
  direction = 'to bottom',
  tail = '100%',
  sideMask,
} = defineProps<{
  layers?: number
  blur?: number
  direction?: string
  tail?: string
  sideMask?: string
}>()

// Each layer starts its mask transparency a bit later, so the layers drop out one
// by one along the tail and the effective blur radius (about blur * sqrt(live layers)) decays
// The mask has to sit on the same element as backdrop-filter (on an ancestor it cuts off
// the very background backdrop-filter reads, and the blur stops working)
// The darkening at the viewport edge is not fully solved
function styleFor(i: number) {
  const main = `linear-gradient(${direction}, black calc(100% - ${tail}), transparent calc(100% - ${tail} * ${(layers - i) / layers}))`
  return {
    backdropFilter: `blur(${blur}px) brightness(var(--progressive-blur-brightness, 1))`,
    WebkitBackdropFilter: `blur(${blur}px) brightness(var(--progressive-blur-brightness, 1))`,
    maskImage: sideMask ? `${main}, ${sideMask}` : main,
    ...(sideMask ? { maskComposite: 'intersect' } : {}),
  }
}
</script>

<template>
  <div class="progressive-blur" aria-hidden="true">
    <div v-for="i in layers" :key="i" class="blur-layer" :style="styleFor(i)" />
  </div>
</template>

<style scoped>
.progressive-blur {
  position: absolute;
  pointer-events: none;

  .blur-layer {
    position: absolute;
    inset: 0;
    background: var(--progressive-blur-veil, transparent);
  }
}
</style>
