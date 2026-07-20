<script setup lang="ts">
const {
  layers = 3,
  blur = 4,
  brightness = 0.92,
  direction = 'to bottom',
  tail = '100%',
  sideMask,
} = defineProps<{
  layers?: number
  blur?: number
  brightness?: number
  direction?: string
  tail?: string
  sideMask?: string
}>()

// 各層の mask の透明開始位置をずらし、tail 内で層が 1 枚ずつ脱落して
// 実効 blur 半径 (≈ blur * √有効層数) が段階的に減衰するようにする
// mask は backdrop-filter と同じ要素に置く必要がある (祖先に置くと backdrop-filter が
// 参照する背景そのものが遮断され、blur が効かなくなる)
// viewport 端が暗くなる問題は完全な解決ができていない
function styleFor(i: number) {
  const main = `linear-gradient(${direction}, black calc(100% - ${tail}), transparent calc(100% - ${tail} * ${(layers - i) / layers}))`
  return {
    backdropFilter: `blur(${blur}px) brightness(${brightness})`,
    WebkitBackdropFilter: `blur(${blur}px) brightness(${brightness})`,
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
  }
}
</style>
