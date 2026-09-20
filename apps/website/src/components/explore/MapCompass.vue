<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { project, rotatePoint } from '@/lib/isoMap'

const { t } = useI18n()

const SIZE = 64
const CENTER = SIZE / 2
const REACH = 17
const HEAD = 5

// Follows the map: plan north turned and projected the same way the floors are
const northward = project(rotatePoint({ x: 0, y: -1 }).x, rotatePoint({ x: 0, y: -1 }).y)
const length = Math.hypot(northward.x, northward.y)
const north = { x: northward.x / length, y: northward.y / length }

function arrow(letter: string, sign: 1 | -1) {
  const dx = north.x * sign
  const dy = north.y * sign
  const tip = { x: CENTER + dx * REACH, y: CENTER + dy * REACH }
  const base = { x: CENTER + dx * (REACH - HEAD), y: CENTER + dy * (REACH - HEAD) }
  const side = { x: -dy * HEAD * 0.6, y: dx * HEAD * 0.6 }
  return {
    letter,
    line: `M${CENTER},${CENTER} L${base.x},${base.y}`,
    head: `${tip.x},${tip.y} ${base.x + side.x},${base.y + side.y} ${base.x - side.x},${base.y - side.y}`,
    label: { x: CENTER + dx * (REACH + 8), y: CENTER + dy * (REACH + 8) },
  }
}

const arrows = [arrow('N', 1), arrow('S', -1)]
</script>

<template>
  <svg
    class="map-compass"
    :viewBox="`0 0 ${SIZE} ${SIZE}`"
    :width="SIZE"
    :height="SIZE"
    role="img"
    :aria-label="t('explore.map.compass')"
  >
    <g v-for="entry in arrows" :key="entry.letter" :class="entry.letter">
      <path class="line" :d="entry.line" />
      <polygon class="head" :points="entry.head" />
      <text class="letter" :x="entry.label.x" :y="entry.label.y">{{ entry.letter }}</text>
    </g>
  </svg>
</template>

<style scoped>
.map-compass {
  display: block;
  overflow: visible;
  font-family: var(--font-display);

  .N {
    color: var(--color-accent);
  }

  .S {
    color: oklch(62% 0.15 250);
  }

  .line {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.6;
    stroke-linecap: round;
  }

  .head {
    fill: currentColor;
  }

  .letter {
    fill: currentColor;
    font-size: 12px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
  }
}
</style>
