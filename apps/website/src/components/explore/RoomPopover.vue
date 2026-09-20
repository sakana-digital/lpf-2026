<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OrgStatus } from '@shared/status'
import type { Organization } from '@/data/organizations'
import { organizationGroupName, organizationProjectName } from '@/lib/organization'
import BookmarkToggle from '@/components/layout/BookmarkToggle.vue'
import MapIcon from './MapIcon.vue'
import OrgDetail from './OrgDetail.vue'
import OrgHead from './OrgHead.vue'
import OrgMeta from './OrgMeta.vue'

/** The room's drawn box, relative to the frame the popover is positioned in */
export interface PopoverAnchor {
  x: number
  top: number
  bottom: number
}

const props = defineProps<{
  title: string
  orgs: Organization[]
  statuses?: ReadonlyMap<string, OrgStatus>
  selectedOrgId?: string
  anchor: PopoverAnchor
  frame: { width: number; height: number }
  /** Frame pixels at the top covered by the fixed bars, which the popover opens clear of */
  clearance: number
}>()

const emit = defineEmits<{ toggle: [id: string]; close: [] }>()

const { t, locale } = useI18n()

const GAP = 14
const WIDTH = 320

// A lone group has nothing to make way for, so its details just stay open
const single = computed(() => props.orgs.length === 1)

const rows = computed(() =>
  props.orgs.map((org) => ({
    org,
    group: organizationGroupName(org, locale.value, t),
    project: organizationProjectName(org, locale.value),
    expanded: single.value || org.id === props.selectedOrgId,
  })),
)

const rootRef = useTemplateRef<HTMLElement>('rootRef')
const closeRef = useTemplateRef<HTMLButtonElement>('closeRef')

// Above the room when it fits between the room and the bars, else below.
// Settled once from the size it opens at, so a group unfolding grows it in
// place instead of flipping it around; a new room mounts a new popover
const placement = ref<'above' | 'below'>()

const heightObserver = new ResizeObserver((entries) => {
  const height = entries[0]?.borderBoxSize[0]?.blockSize
  if (placement.value || !height) return
  placement.value = props.anchor.top - props.clearance - GAP >= height ? 'above' : 'below'
})

onMounted(() => {
  if (rootRef.value) heightObserver.observe(rootRef.value)
  closeRef.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => heightObserver.disconnect())

const style = computed(() => {
  const { anchor, frame } = props
  const width = Math.min(WIDTH, frame.width - 16)
  const left = Math.min(Math.max(anchor.x - width / 2, 8), Math.max(8, frame.width - width - 8))
  const edge =
    placement.value === 'above'
      ? { bottom: `${frame.height - anchor.top + GAP}px` }
      : { top: `${anchor.bottom + GAP}px` }
  return { width: `${width}px`, left: `${left}px`, '--arrow-x': `${anchor.x - left}px`, ...edge }
})
</script>

<template>
  <section
    ref="rootRef"
    class="room-popover"
    :class="[placement, { measuring: !placement }]"
    :style="style"
    role="dialog"
    :aria-label="title"
    @keydown.esc="emit('close')"
  >
    <header class="popover-head">
      <h2 class="room-title">{{ title }}</h2>
      <button
        ref="closeRef"
        type="button"
        class="close"
        :aria-label="t('explore.map.close')"
        @click="emit('close')"
      >
        <MapIcon name="close" />
      </button>
    </header>
    <p v-if="rows.length === 0" class="empty">{{ t('explore.map.noGroups') }}</p>
    <ul v-else class="org-list">
      <li v-for="{ org, group, project, expanded } in rows" :key="org.id" class="org">
        <OrgHead :expanded="expanded" :plain="single" @toggle="emit('toggle', org.id)">
          <span class="org-name">{{ group }}</span>
          <span v-if="project" class="org-project">{{ project }}</span>
          <template #meta>
            <OrgMeta>
              <BookmarkToggle :org-id="org.id" />
            </OrgMeta>
          </template>
        </OrgHead>
        <div v-if="expanded" class="org-expand">
          <OrgDetail :org="org" :status="statuses?.get(org.id)" />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.room-popover {
  --arrow: 10px;

  position: absolute;
  z-index: var(--z-overlay);
  display: flex;
  flex-direction: column;
  max-height: min(60vh, 440px);
  padding: 12px;
  border: 1px solid var(--color-border-hover);
  background: var(--color-background);
  box-shadow: var(--shadow-overlay);

  &.measuring {
    visibility: hidden;
  }

  &::before {
    content: '';
    position: absolute;
    left: calc(var(--arrow-x, 50%) - var(--arrow));
    width: calc(var(--arrow) * 2);
    height: calc(var(--arrow) * 2);
    background: inherit;
    border: inherit;
    transform: rotate(45deg);
  }

  &.above::before {
    bottom: calc(var(--arrow) * -1 - 1px);
    clip-path: polygon(0 100%, 100% 0, 100% 100%);
  }

  &.below::before {
    top: calc(var(--arrow) * -1 - 1px);
    clip-path: polygon(0 0, 100% 0, 0 100%);
  }

  .popover-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .room-title {
    flex: 1;
    margin: 0;
    font-size: 14px;
    line-height: 1.3;
    color: var(--color-heading);
  }

  .close {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    margin: -6px -6px -6px 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--color-text-mute);
    cursor: pointer;

    &:hover {
      color: var(--color-heading);
    }
  }

  .empty {
    margin: 0;
    color: var(--color-text-mute);
    font-size: 13px;
  }

  .org-list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    list-style: none;

    .org {
      position: relative;
      padding: 10px 0;

      & + .org {
        border-top: 1px solid var(--color-border);
      }
    }

    .org-name {
      color: var(--color-heading);
      font-size: 13px;
      line-height: 1.3;
    }

    .org-project {
      margin-top: 2px;
      color: var(--color-text-mute);
      font-size: 12px;
      line-height: 1.3;
    }

    .org-expand {
      margin-top: 10px;
    }
  }
}
</style>
