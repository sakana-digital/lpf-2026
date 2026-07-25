<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ISO_MAP_FLOORS } from '@/config/isoMap'
import { getOrganization, getOrganizationByRoom, organizationName } from '@/config/organizations'
import { useIsoMap } from '@/composables/useIsoMap'
import { useOrgStatus } from '@/composables/useOrgStatus'
import type { IsoMapLabels } from '@/lib/isoMap/scene'
import BookmarkToggle from '@/components/common/BookmarkToggle.vue'
import OrgDetail from './OrgDetail.vue'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const { statuses } = useOrgStatus()

const selectedId = computed(() => {
  const org = route.query.org
  return typeof org === 'string' && getOrganization(org) ? org : undefined
})
const selectedOrg = computed(() =>
  selectedId.value ? getOrganization(selectedId.value) : undefined,
)
const selectedName = computed(() =>
  selectedOrg.value ? organizationName(selectedOrg.value, locale.value) : '',
)
const selectedLabel = computed(() => {
  const org = selectedOrg.value
  if (!org) return ''
  return org.kind === 'class'
    ? t('explore.events.classLabel', { grade: org.grade, classNo: org.classNo })
    : selectedName.value
})

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
const labels = computed<IsoMapLabels>(() => ({
  avRoomRoute: t('explore.map.labels.avRoomRoute'),
  classroom: t('explore.map.labels.classroom'),
  courtyard: t('explore.map.labels.courtyard'),
  stage: t('explore.map.labels.stage'),
  stairs: t('explore.map.labels.stairs'),
  tents: t('explore.map.labels.tents'),
  toilet: t('explore.map.labels.toilet'),
}))
function organizationForArea(areaId: string) {
  return getOrganizationByRoom(areaId)
}

function onLabelClick(areaId: string) {
  const org = organizationForArea(areaId)
  if (!org) return
  router.replace({
    query: { ...route.query, org: org.id === selectedId.value ? undefined : org.id },
  })
}

const { floor, zoom, canZoomIn, canZoomOut, setFloor, zoomIn, zoomOut, resetZoom } = useIsoMap(
  canvasRef,
  labels,
  {
    onLabelClick,
    isLabelInteractive: (areaId) => !!organizationForArea(areaId),
  },
)

watch(
  selectedOrg,
  (org) => {
    if (org?.location) setFloor(org.location.floor)
  },
  { immediate: true },
)

function closeDetail() {
  router.replace({ query: { ...route.query, org: undefined } })
}

const floorButtons = [...ISO_MAP_FLOORS].reverse()
</script>

<template>
  <div class="map">
    <div class="viewport">
      <canvas ref="canvasRef" :aria-label="t('explore.tabs.map')"></canvas>
      <div class="compass" aria-hidden="true">
        <svg viewBox="0 0 88 72">
          <path d="M44 58 13 40m0 0 10 0m-10 0 4 9" />
          <path d="M44 58 75 40m0 0-10 0m10 0-4 9" />
          <text x="5" y="35">{{ t('explore.map.directions.north') }}</text>
          <text x="78" y="35">{{ t('explore.map.directions.east') }}</text>
        </svg>
      </div>
      <div class="controls" role="group" :aria-label="t('explore.map.floorSwitch')">
        <button
          v-for="f in floorButtons"
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
      <div class="zoom-controls" role="group" :aria-label="t('explore.map.zoomControls')">
        <button
          type="button"
          :disabled="!canZoomOut"
          :aria-label="t('explore.map.zoomOut')"
          @click="zoomOut"
        >
          −
        </button>
        <button
          type="button"
          class="zoom-value"
          :aria-label="t('explore.map.resetZoom')"
          @click="resetZoom"
        >
          {{ Math.round(zoom * 100) }}%
        </button>
        <button
          type="button"
          :disabled="!canZoomIn"
          :aria-label="t('explore.map.zoomIn')"
          @click="zoomIn"
        >
          +
        </button>
      </div>
      <div v-if="selectedOrg" class="org-panel">
        <div class="org-panel-head">
          <div class="org-panel-info">
            <span class="org-panel-label">{{ selectedLabel }}</span>
            <span
              v-if="selectedOrg.kind === 'class'"
              class="org-panel-name"
              :class="{ tbd: !selectedName }"
            >
              {{ selectedName || t('explore.events.tbd') }}
            </span>
          </div>
          <button
            class="org-panel-close"
            :aria-label="t('explore.nodes.close')"
            @click="closeDetail"
          >
            ×
          </button>
        </div>
        <OrgDetail
          :org="selectedOrg"
          :status="statuses.get(selectedOrg.id)"
          :image-alt="selectedName || selectedLabel"
        >
          <template #actions>
            <BookmarkToggle :org-id="selectedOrg.id" />
          </template>
        </OrgDetail>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map {
  min-height: 100svh;

  .viewport {
    position: fixed;
    z-index: 0;
    inset: 0;
    isolation: isolate;
    width: 100vw;
    height: 100svh;
    height: 100dvh;
    overflow: hidden;

    canvas {
      position: absolute;
      z-index: 0;
      inset: 0;
      display: block;
      width: 100%;
      height: 100%;
    }

    .controls {
      position: absolute;
      z-index: 1;
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

    .compass {
      position: absolute;
      z-index: 1;
      top: calc(var(--header-height) + var(--page-title-height) + 14px);
      right: 16px;
      width: 88px;
      color: var(--color-heading);
      pointer-events: none;

      @media (max-height: 500px) {
        top: 14px;
      }

      svg {
        display: block;
        width: 100%;
        overflow: visible;
      }

      path {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: square;
        stroke-linejoin: miter;
      }

      text {
        fill: currentColor;
        font-size: 11px;
        font-weight: 600;
      }
    }

    .zoom-controls {
      position: absolute;
      z-index: 1;
      right: 16px;
      bottom: 16px;
      display: flex;
      border: 1px solid var(--color-border);
      background: var(--color-background);

      button {
        display: grid;
        min-width: 36px;
        height: 36px;
        padding: 0 10px;
        place-items: center;
        background: var(--color-background);
        color: var(--color-text);
        font: inherit;
        font-size: 16px;
        cursor: pointer;
        transition:
          background 0.15s,
          color 0.15s;

        & + button {
          border-left: 1px solid var(--color-border);
        }

        &:hover:not(:disabled) {
          background: var(--color-background-mute);
          color: var(--color-heading);
        }

        &:disabled {
          color: var(--color-text-mute);
          cursor: default;
          opacity: 0.45;
        }

        &.zoom-value {
          min-width: 64px;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }
      }
    }

    .org-panel {
      position: absolute;
      z-index: 2;
      top: calc(var(--header-height) + var(--page-title-height) + 16px);
      left: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: min(320px, calc(100% - 32px));
      max-height: calc(100dvh - var(--header-height) - var(--page-title-height) - 32px);
      padding: 12px 16px;
      border: 1px solid var(--color-border);
      background: var(--color-background);
      overflow: auto;

      .org-panel-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }

      .org-panel-info {
        display: flex;
        align-items: baseline;
        gap: 12px;
        min-width: 0;
      }

      .org-panel-label {
        color: var(--color-heading);
        font-size: 14px;
        font-variant-numeric: tabular-nums;
      }

      .org-panel-name {
        overflow: hidden;
        color: var(--color-text);
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.tbd {
          color: var(--color-text-mute);
        }
      }

      .org-panel-close {
        flex-shrink: 0;
        padding: 0 4px;
        color: var(--color-text-mute);
        font: inherit;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;

        &:hover {
          color: var(--color-heading);
        }
      }

      @media (max-height: 500px) {
        top: 16px;
        max-height: calc(100dvh - 32px);
      }
    }
  }
}
</style>
