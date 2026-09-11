<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  organizationGroupName,
  organizationImageSrc,
  organizationProjectName,
} from '@/lib/organization'
import type { Organization } from '@/data/organizations'
import { SWEEP_LEAD } from '@/lib/eventsGrid'
import type { CellPreview, SweepPhase } from '@/lib/eventsGrid'
import type { OrgStatus } from '@shared/status'
import OrgDetail from './OrgDetail.vue'
import OrgMeta from './OrgMeta.vue'
import OrgStatusBadges from './OrgStatusBadges.vue'

const props = defineProps<{
  org: Organization | null
  expanded: boolean
  preview?: CellPreview
  status?: OrgStatus
  /** When the backdrop joins the intro sweep, in ms after the top-left corner. */
  sweepDelay: number
  sweepPhase?: SweepPhase
}>()

defineEmits<{ select: [] }>()

const { t, locale } = useI18n()

const groupName = computed(() =>
  props.org ? organizationGroupName(props.org, locale.value, t) : '',
)

const projectName = computed(() =>
  props.org ? organizationProjectName(props.org, locale.value) : '',
)

// Tiles and the column preview stay small; the row preview fills its cell
const thumbSrc = computed(() => (props.org ? organizationImageSrc(props.org, 160) : undefined))
const previewSrc = computed(() => (props.org ? organizationImageSrc(props.org, 400) : undefined))
</script>

<template>
  <div
    v-if="org"
    class="cell"
    :class="{ expanded, wide: preview === 'wide', tall: preview === 'tall' }"
  >
    <div class="head-row">
      <button type="button" class="cell-head" :aria-expanded="expanded" @click="$emit('select')">
        <span class="label">{{ groupName }}</span>
        <span v-if="projectName" class="name">{{ projectName }}</span>
      </button>
      <OrgStatusBadges v-if="!expanded && status" :status="status" class="cell-status" />
      <OrgMeta v-if="expanded" :place="org.place">
        <slot name="actions"></slot>
      </OrgMeta>
      <Transition name="preview-fade">
        <img
          v-if="preview === 'wide' && thumbSrc"
          class="preview wide"
          :src="thumbSrc"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </Transition>
    </div>
    <Transition name="preview-fade">
      <img
        v-if="preview === 'tall' && previewSrc"
        class="preview tall"
        :src="previewSrc"
        alt=""
        loading="lazy"
        decoding="async"
      />
    </Transition>
    <Transition name="detail-fade">
      <div v-if="expanded" class="detail">
        <OrgDetail :org="org" :status="status" />
      </div>
    </Transition>
    <img
      v-if="thumbSrc"
      class="backdrop"
      :class="{
        pending: sweepPhase === 'load',
        running: sweepPhase === 'run',
        lead: sweepDelay <= SWEEP_LEAD,
      }"
      :src="thumbSrc"
      :style="{ animationDelay: `${sweepDelay}ms` }"
      alt=""
      aria-hidden="true"
      decoding="async"
    />
  </div>
  <div v-else class="cell blank" aria-hidden="true"></div>
</template>

<style scoped>
/* The preview and the detail share the second row, so one fading out never pushes the other */
.cell {
  position: relative;
  --backdrop-blur: 12px;

  display: grid;
  grid-template-columns: 100%;
  align-content: start;
  gap: 8px;
  min-width: 0;
  min-height: 0;
  padding: 8px;
  isolation: isolate;
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  color: var(--color-text);
  overflow: hidden;
  transition:
    border-color 0.15s,
    color 0.15s;

  &:hover {
    border-color: var(--color-border-hover);
    color: var(--color-heading);
  }

  &.expanded {
    border-color: var(--color-heading);
    color: var(--color-heading);
  }

  &.expanded,
  &.tall {
    --backdrop-blur: 28px;
  }

  &.blank {
    border-style: dashed;
    cursor: default;
    pointer-events: none;
  }

  .head-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

    .preview.wide {
      flex-shrink: 0;
      width: auto;
      height: 100%;
    }

    .cell-status {
      flex-direction: column;
      flex-shrink: 0;
      align-items: flex-end;
      gap: 6px;
    }
  }

  .cell-head {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 0;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    /* Stretch the hit area over the whole cell */
    &::after {
      content: '';
      position: absolute;
      inset: 0;
    }

    .label,
    .name {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }

    .name {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  /* Laid out at the final width from the start, so the name wraps the same while the column widens */
  &.expanded .head-row,
  &.wide .head-row {
    width: var(--expanded-content);
  }

  &.wide {
    grid-template-rows: 1fr;

    .head-row {
      align-items: flex-start;
      min-height: 0;
    }
  }

  .preview.tall {
    grid-row: 2;
    align-self: start;
    width: 100%;
    height: auto;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    z-index: -1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    scale: 1.15;
    filter: blur(var(--backdrop-blur)) saturate(1.4);
    opacity: 0.5;
    pointer-events: none;
    transition: filter 0.3s;

    &.pending {
      opacity: 0;
    }

    &.running {
      animation: sweep-in var(--sweep-duration) ease-out both;
    }
  }
}

@keyframes sweep-in {
  from {
    opacity: 0;
  }
}

.cell-status :deep(.badge) {
  padding: 1px 6px;
  line-height: 1.2;
}

/* Only the controls in the detail sit above that hit area */
.cell :deep(.org-detail :is(a, button)) {
  position: relative;
}

/*
 * Kept at its natural size and revealed by the row track, which the grid eases.
 * The fixed width keeps that size off the animating column, so the row can be
 * measured while it moves.
 */
.detail {
  grid-row: 2;
  width: var(--expanded-content);
}

/* Same duration as the row, so the content outlives the collapse */
.detail-fade-enter-active,
.detail-fade-leave-active {
  transition: opacity 0.3s ease-out;
}

.detail-fade-enter-from,
.detail-fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-active {
  transition: opacity 0.3s ease-out;
}

.preview-fade-enter-from {
  opacity: 0;
}

/*
 * Out of flow rather than transitioned out: one lingering frame would push the
 * detail replacing it, and a wide preview would still be in the head row the
 * open row measures.
 */
.preview-fade-leave-active {
  display: none;
}
</style>
