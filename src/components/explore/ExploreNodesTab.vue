<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { getOrganization, organizationName, organizations } from '@/config/organizations'
import { buildOrganizationSphere } from '@/lib/sphereGraph'
import { useSphereGraph } from '@/composables/useSphereGraph'
import BookmarkToggle from '@/components/common/BookmarkToggle.vue'

const { t, locale } = useI18n()

const { nodes, edges } = buildOrganizationSphere(organizations)
const nodeMeta = new Map(nodes.map((node) => [node.id, node]))

const containerRef = useTemplateRef<HTMLElement>('containerRef')
const { projected, isDragging } = useSphereGraph(nodes, containerRef)

const byId = computed(() => new Map(projected.value.map((p) => [p.id, p])))

const edgeLines = computed(() =>
  edges.flatMap((edge) => {
    const from = byId.value.get(edge.from)
    const to = byId.value.get(edge.to)
    if (!from || !to) return []
    return [
      {
        id: `${edge.from}-${edge.to}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        opacity: Math.min(from.opacity, to.opacity) * 0.6,
      },
    ]
  }),
)

const selectedId = ref<string | null>(null)
const selectedOrg = computed(() =>
  selectedId.value ? getOrganization(selectedId.value) : undefined,
)
const selectedName = computed(() =>
  selectedOrg.value ? organizationName(selectedOrg.value, locale.value) : '',
)

function onNodeClick(id: string) {
  if (isDragging.value) return
  if (nodeMeta.get(id)?.kind !== 'leaf') return
  selectedId.value = selectedId.value === id ? null : id
}

function nodeLabel(id: string): string {
  const meta = nodeMeta.get(id)
  return meta ? t(meta.labelKey, meta.labelParams ?? {}) : ''
}

function nodeStyle(p: (typeof projected.value)[number]) {
  return {
    transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${p.scale})`,
    opacity: p.opacity,
    zIndex: p.zIndex,
  }
}
</script>

<template>
  <div class="nodes">
    <div
      ref="containerRef"
      class="viewport"
      :class="{ dragging: isDragging }"
      :aria-label="t('explore.nodes.graphLabel')"
    >
      <svg class="edges" aria-hidden="true">
        <line
          v-for="line in edgeLines"
          :key="line.id"
          :x1="line.x1"
          :y1="line.y1"
          :x2="line.x2"
          :y2="line.y2"
          :opacity="line.opacity"
        />
      </svg>
      <button
        v-for="p in projected"
        :key="p.id"
        class="node"
        :class="{
          group: nodeMeta.get(p.id)?.kind === 'group',
          selected: p.id === selectedId,
        }"
        :style="nodeStyle(p)"
        @click="onNodeClick(p.id)"
      >
        {{ nodeLabel(p.id) }}
      </button>
      <span v-if="!selectedOrg" class="hint">{{ t('explore.nodes.hint') }}</span>
    </div>

    <div v-if="selectedOrg" class="detail">
      <div class="info">
        <span class="label">{{ nodeLabel(selectedOrg.id) }}</span>
        <span class="name" :class="{ tbd: !selectedName }">
          {{ selectedName || t('explore.events.tbd') }}
        </span>
        <span v-if="selectedOrg.location" class="location">
          {{ t('explore.events.location', { floor: selectedOrg.location.floor }) }}
        </span>
      </div>
      <BookmarkToggle :org-id="selectedOrg.id" />
    </div>
  </div>
</template>

<style scoped>
.nodes {
  position: relative;

  .viewport {
    position: relative;
    height: calc(100svh - var(--header-height) - var(--page-title-height));
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    user-select: none;

    @media (max-height: 500px) {
      html[data-orientation='landscape-left'] &,
      html[data-orientation='landscape-right'] & {
        height: 100svh;
      }
    }

    &.dragging {
      cursor: grabbing;
    }

    .edges {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;

      line {
        stroke: var(--color-border-hover);
        stroke-width: 1;
      }
    }

    .node {
      position: absolute;
      top: 0;
      left: 0;
      padding: 3px 8px;
      border: 1px solid var(--color-border);
      background: var(--color-background);
      color: var(--color-text);
      font: inherit;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      cursor: pointer;
      transition:
        border-color 0.15s,
        color 0.15s;

      &:hover {
        border-color: var(--color-border-hover);
        color: var(--color-heading);
      }

      &.group {
        background: var(--color-heading);
        border-color: var(--color-heading);
        color: var(--color-background);
      }

      &.selected {
        border-color: var(--color-heading);
        color: var(--color-heading);
      }
    }

    .hint {
      position: absolute;
      right: 12px;
      bottom: 8px;
      color: var(--color-text-mute);
      font-size: 11px;
      pointer-events: none;
    }
  }

  .detail {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 16px;
    border: 1px solid var(--color-border);
    background: var(--color-background);

    .info {
      display: flex;
      align-items: baseline;
      gap: 12px;
      min-width: 0;

      .label {
        color: var(--color-heading);
        font-size: 14px;
        font-variant-numeric: tabular-nums;
      }

      .name {
        overflow: hidden;
        color: var(--color-text);
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.tbd {
          color: var(--color-text-mute);
        }
      }

      .location {
        color: var(--color-text-mute);
        font-size: 12px;
        font-variant-numeric: tabular-nums;
      }
    }
  }
}
</style>
