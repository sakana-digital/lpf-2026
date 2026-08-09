<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { getOrganization, organizationName, organizations } from '@/config/organizations'
import { buildOrganizationSphere } from '@/lib/sphereGraph'
import { useSphereGraph } from '@/composables/useSphereGraph'
import type { OrgStatus } from '../../../../../shared/status'
import BookmarkToggle from '@/components/common/BookmarkToggle.vue'
import OrgDetail from './OrgDetail.vue'

const props = defineProps<{
  selectedId?: string
  statuses?: ReadonlyMap<string, OrgStatus>
}>()

const emit = defineEmits<{ select: [id: string | null] }>()

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
        opacity: Math.min(from.opacity, to.opacity) * 0.75,
      },
    ]
  }),
)

const selectedOrg = computed(() =>
  props.selectedId ? getOrganization(props.selectedId) : undefined,
)
const selectedName = computed(() =>
  selectedOrg.value ? organizationName(selectedOrg.value, locale.value) : '',
)

function onNodeClick(id: string) {
  if (isDragging.value) return
  if (nodeMeta.get(id)?.kind !== 'leaf') return
  emit('select', id === props.selectedId ? null : id)
}

function nodeLabel(id: string): string {
  const meta = nodeMeta.get(id)
  if (!meta) return ''
  if (meta.orgId) {
    const org = getOrganization(meta.orgId)
    if (org && org.kind !== 'class') {
      return organizationName(org, locale.value) || t('explore.events.tbd')
    }
  }
  return t(meta.labelKey, meta.labelParams ?? {})
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
      <div class="head">
        <div class="info">
          <span class="label">{{ nodeLabel(selectedOrg.id) }}</span>
          <span v-if="selectedOrg.kind === 'class'" class="name" :class="{ tbd: !selectedName }">
            {{ selectedName || t('explore.events.tbd') }}
          </span>
        </div>
        <button class="close" :aria-label="t('explore.nodes.close')" @click="emit('select', null)">
          ×
        </button>
      </div>
      <OrgDetail :org="selectedOrg" :status="statuses?.get(selectedOrg.id)">
        <template #actions>
          <BookmarkToggle :org-id="selectedOrg.id" />
        </template>
      </OrgDetail>
    </div>
  </div>
</template>

<style scoped>
.nodes {
  position: relative;

  .viewport {
    position: relative;
    z-index: 0;
    height: 100%;
    overflow: hidden;
    touch-action: none;
    cursor: grab;
    user-select: none;

    &.dragging {
      cursor: grabbing;
    }

    .edges {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;

      line {
        stroke: var(--color-text-mute);
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
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: min(320px, calc(100% - 32px));
    padding: 12px 16px;
    border: 1px solid var(--color-border);
    background: var(--color-background);

    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;

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
      }

      .close {
        flex-shrink: 0;
        padding: 0 4px;
        border: none;
        background: transparent;
        color: var(--color-text-mute);
        font: inherit;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        transition: color 0.15s;

        &:hover {
          color: var(--color-heading);
        }
      }
    }
  }
}
</style>
