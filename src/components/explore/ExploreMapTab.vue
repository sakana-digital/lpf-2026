<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { FLOORS } from '@/config/venueMap'
import { useIsoMap } from '@/composables/useIsoMap'

const { t } = useI18n()

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
const { floor, setFloor } = useIsoMap(canvasRef)
</script>

<template>
  <div class="map">
    <div class="viewport">
      <canvas ref="canvasRef" :aria-label="t('explore.tabs.map')"></canvas>
      <div class="controls" role="group" :aria-label="t('explore.map.floorSwitch')">
        <button
          v-for="f in FLOORS"
          :key="f"
          :class="{ active: floor === f }"
          :aria-pressed="floor === f"
          @click="setFloor(f)"
        >
          {{ t('explore.map.floor', { floor: f }) }}
        </button>
        <button
          :class="{ active: floor === 'all' }"
          :aria-pressed="floor === 'all'"
          @click="setFloor('all')"
        >
          {{ t('explore.map.overview') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map {
  padding: 24px 0 48px;

  .viewport {
    position: relative;
    height: min(60vh, 560px);
    border: 1px solid var(--color-border);
    overflow: hidden;

    canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .controls {
      position: absolute;
      bottom: 16px;
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      button {
        min-width: 48px;
        padding: 6px 12px;
        border: 1px solid var(--color-border);
        background: var(--color-background);
        color: var(--color-text);
        font: inherit;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
        transition:
          background 0.15s,
          color 0.15s,
          border-color 0.15s;

        &:hover {
          border-color: var(--color-border-hover);
          color: var(--color-heading);
        }

        &.active {
          background: var(--color-heading);
          border-color: var(--color-heading);
          color: var(--color-background);
        }
      }
    }
  }
}
</style>
