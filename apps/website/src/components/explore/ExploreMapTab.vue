<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { localized } from '@shared/locale'
import { campusFloors, FLOOR_LEVELS, isFloorLevel } from '@/data/campusMap'
import { findRoom, floorOfRoom, placeRoomIds, roomOrganizations, roomPlace } from '@/lib/campusMap'
import type { MapRoomRef } from '@/lib/campusMap'
import { organizationPlaceLabel } from '@/lib/organization'
import { useOrgStatus } from '@/stores/orgStatus'
import { useSelectedOrg } from '@/composables/useSelectedOrg'
import SegmentedSwitch from './SegmentedSwitch.vue'
import IsoMap from './IsoMap.vue'
import type { FloorChoice } from './IsoMap.vue'
import MapCompass from './MapCompass.vue'
import MapIcon from './MapIcon.vue'
import RoomPopover from './RoomPopover.vue'
import type { PopoverAnchor } from './RoomPopover.vue'

const route = useRoute()
const router = useRouter()

const { t, locale } = useI18n()
const { statuses } = useOrgStatus()
const { selectedId: selectedOrgId, selectedOrg, toggle } = useSelectedOrg()

const linked = new Set(roomOrganizations.keys())

// Where the group picked on another tab is, so the map opens on its floor
const emphasized = computed(() =>
  selectedOrg.value ? placeRoomIds(selectedOrg.value.place).filter((id) => findRoom(id)) : [],
)

const room = computed(() => {
  const id = route.query.room
  return typeof id === 'string' ? findRoom(id) : undefined
})

const roomId = computed(() => room.value?.room.id)

const roomOrgs = computed(() => (roomId.value ? (roomOrganizations.get(roomId.value) ?? []) : []))

// Kept in `?floor=` like the day, so it survives a tab switch; a link to a
// room or a group opens on their floor
const floor = computed<FloorChoice>(() => {
  if (route.query.floor === 'all') return 'all'
  const queried = Number(route.query.floor)
  if (isFloorLevel(queried)) return queried
  return floorOfRoom(roomId.value) ?? floorOfRoom(emphasized.value[0]) ?? 'all'
})

function setFloor(choice: FloorChoice) {
  router.replace({ query: { ...route.query, floor: String(choice) } })
}

const floorOptions = computed<{ value: FloorChoice; label: string }[]>(() => [
  { value: 'all', label: t('explore.map.allFloors') },
  ...FLOOR_LEVELS.map((level) => ({ value: level, label: t('explore.map.floor', { level }) })),
])

// A room with a single group opens on its details, since a second tap would be
// the only thing left to do; the floor is written too, so the overview stays
// the overview and a single floor stays once the group is cleared
function selectRoom(id: string) {
  pickedHere = true
  const next = id === roomId.value ? undefined : id
  const orgs = next ? (roomOrganizations.get(next) ?? []) : []
  const keep = orgs.some((org) => org.id === selectedOrgId.value) ? selectedOrgId.value : undefined
  router.replace({
    query: {
      ...route.query,
      floor: String(floor.value),
      room: next,
      org: orgs.length === 1 ? orgs[0]?.id : keep,
    },
  })
}

function clearRoom() {
  if (roomId.value || selectedOrgId.value) {
    pickedHere = true
    router.replace({ query: { ...route.query, room: undefined, org: undefined } })
  }
}

function toggleOrg(id: string) {
  pickedHere = true
  void toggle(id)
}

// A group picked elsewhere, on another tab or before the map opened, is
// brought into view: its room opens on its floor and the map moves onto it.
// Picks made on the map itself leave the view where the user has it
let pickedHere = false
const pendingFocus = ref<string>()

function focusPending() {
  if (pendingFocus.value && mapRef.value?.focusRoom(pendingFocus.value)) {
    pendingFocus.value = undefined
  }
}

watch(
  selectedOrgId,
  (id) => {
    if (pickedHere) {
      pickedHere = false
      return
    }
    const target = id ? emphasized.value[0] : undefined
    if (!target) return
    if (roomId.value !== target || floor.value === 'all') {
      router.replace({
        query: { ...route.query, floor: String(floorOfRoom(target)), room: target, org: id },
      })
    }
    pendingFocus.value = target
    void nextTick(focusPending)
  },
  { immediate: true },
)

function onSettled() {
  focusPending()
  placePopover()
}

function roomTitle({ floor, room }: MapRoomRef): string {
  const place = organizationPlaceLabel(roomPlace(room), locale.value, t)
  if (room.kind === 'tent') return place
  const name = localized(room.name, locale.value)
  const number = place || t('explore.map.floor', { level: floor.level })
  return name ? t('explore.map.roomName', { room: number, name }) : number
}

const title = computed(() => (room.value ? roomTitle(room.value) : ''))

const mapRoot = useTemplateRef<HTMLElement>('mapRoot')
const frameRef = useTemplateRef<HTMLElement>('frameRef')
const mapRef = useTemplateRef<InstanceType<typeof IsoMap>>('mapRef')

interface Placement {
  anchor: PopoverAnchor
  frame: { width: number; height: number }
  clearance: number
}

const placement = ref<Placement>()

// How far the map runs up behind the fixed bars, read back from the style that pulls it there
function barsHeight(): number {
  return mapRoot.value ? -parseFloat(getComputedStyle(mapRoot.value).marginTop) : 0
}

// The popover hangs off the room's drawn box, so it follows the zoom and the floor slide
function placePopover() {
  const rect = roomId.value ? mapRef.value?.roomRect(roomId.value) : undefined
  const frame = rect && frameRef.value?.getBoundingClientRect()
  if (!rect || !frame) {
    placement.value = undefined
    return
  }
  placement.value = {
    anchor: {
      x: rect.left + rect.width / 2 - frame.left,
      top: rect.top - frame.top,
      bottom: rect.bottom - frame.top,
    },
    frame: { width: frame.width, height: frame.height },
    clearance: Math.max(0, barsHeight() - frame.top),
  }
}

// The view only matters while a popover is up, so idle pans measure nothing
watch([roomId, floor, () => roomId.value && mapRef.value?.view], () => nextTick(placePopover))

onMounted(() => window.addEventListener('resize', placePopover))

onBeforeUnmount(() => window.removeEventListener('resize', placePopover))
</script>

<template>
  <div ref="mapRoot" class="map" :class="{ overview: floor === 'all' }">
    <div class="toolbar">
      <MapCompass class="compass" />
      <SegmentedSwitch
        class="floor-switch"
        :options="floorOptions"
        :model-value="floor"
        :aria-label="t('explore.map.floorSwitch')"
        @update:model-value="setFloor"
      />
    </div>

    <div ref="frameRef" class="map-frame">
      <IsoMap
        ref="mapRef"
        :floors="campusFloors"
        :level="floor"
        :linked="linked"
        :selected="roomId"
        :emphasized="emphasized"
        @select="selectRoom"
        @deselect="clearRoom"
        @settled="onSettled"
      />

      <div
        v-if="floor !== 'all'"
        class="zoom-controls"
        role="group"
        :aria-label="t('explore.map.zoom')"
      >
        <button type="button" :aria-label="t('explore.map.zoomIn')" @click="mapRef?.zoomBy(1.6)">
          <MapIcon name="add" />
        </button>
        <button
          type="button"
          :aria-label="t('explore.map.zoomOut')"
          @click="mapRef?.zoomBy(1 / 1.6)"
        >
          <MapIcon name="remove" />
        </button>
        <button
          type="button"
          :aria-label="t('explore.map.zoomReset')"
          :disabled="mapRef?.atDefault"
          @click="mapRef?.reset()"
        >
          <MapIcon name="fitScreen" />
        </button>
      </div>

      <RoomPopover
        v-if="room && placement"
        :key="roomId"
        :anchor="placement.anchor"
        :frame="placement.frame"
        :clearance="placement.clearance"
        :title="title"
        :orgs="roomOrgs"
        :statuses="statuses"
        :selected-org-id="selectedOrgId"
        @toggle="toggleOrg"
        @close="clearRoom"
      />
    </div>
  </div>
</template>

<style scoped>
.map {
  position: relative;
  width: 100%;
  /* Runs up behind the fixed bars the page keeps its content clear of */
  margin-top: calc(-1 * var(--content-top));

  /* The stack starts below the bars and the toolbar; the toolbar itself stays put */
  &.overview {
    padding-bottom: 48px;

    .map-frame {
      padding-top: calc(var(--content-top) + 72px);
    }
  }

  /* Zero height, so it floats over the map and keeps its place while the stack scrolls */
  .toolbar {
    position: sticky;
    top: calc(var(--content-top) + var(--tab-gap));
    z-index: 2;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    height: 0;
    padding-inline: 8px 16px;
    pointer-events: none;

    & > * {
      pointer-events: auto;
    }
  }

  .floor-switch {
    flex-wrap: wrap;
    justify-content: flex-end;
    row-gap: 8px;
  }

  .map-frame {
    position: relative;
  }

  .zoom-controls {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 2;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    background: var(--color-background);

    button {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--color-text);
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s;

      & + button {
        border-top: 1px solid var(--color-border);
      }

      &:hover:not(:disabled) {
        background: var(--color-background-soft);
        color: var(--color-heading);
      }

      &:disabled {
        color: var(--color-border-hover);
        cursor: default;
      }
    }

    @media (max-width: 600px) {
      flex-direction: row;

      button {
        width: 36px;
        height: 36px;

        & + button {
          border-top: 0;
          border-left: 1px solid var(--color-border);
        }
      }
    }
  }
}
</style>
