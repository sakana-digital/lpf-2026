<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { localized } from '@shared/locale'
import { ROOM_KINDS } from '@/data/campusMap'
import type { FloorLevel, MapBox, MapFloor, MapRoom } from '@/data/campusMap'
import { roomNumber, roomPlace } from '@/lib/campusMap'
import { organizationPlaceLabel } from '@/lib/organization'
import {
  boxBounds,
  boxCenter,
  boxFaces,
  boxTop,
  paintOrder,
  project,
  rotateBox,
  rotatePoint,
  textWidth,
} from '@/lib/isoMap'
import type { Point } from '@/lib/isoMap'
import { ICON_SIZE, mapIcons } from '@/lib/mapIcons'
import { usePanZoom } from '@/composables/usePanZoom'

export type FloorChoice = FloorLevel | 'all'

const props = defineProps<{
  floors: MapFloor[]
  /** One floor on its own, or every floor stacked apart */
  level: FloorChoice
  /** Rooms a group runs in; only these take a click */
  linked: ReadonlySet<string>
  selected?: string
  /** Rooms of the group picked on another tab, called out on top of the selection */
  emphasized?: readonly string[]
}>()

const emit = defineEmits<{
  select: [id: string]
  deselect: []
  /** A floor has finished sliding into place */
  settled: []
}>()

const { t, locale } = useI18n()

const MAX_LABEL = 2.6
const MIN_LABEL = 1.8
const MARGIN = 4
// Room for the floor label hanging off the plate's left corner
const FLOOR_LABEL_GUTTER = 8
const FLOOR_LABEL_GAP = 2
// Slab pieces overlap by a hair so their shared edges leave no seam
const SEAM = 0.05
// A tall box, a phone held upright, starts pulled back a little
const PORTRAIT_SCALE = 0.7

const ROOF_HEIGHT = ROOM_KINDS.room.height

const rotatedFloors = computed(() =>
  props.floors.map((floor) => ({
    ...floor,
    slab: floor.slab.map((box) => rotateBox(box)),
    ground: (floor.ground ?? []).map((box) => rotateBox(box)),
    rooms: floor.rooms.map((room) => rotateBox(room)),
    noEntry: (floor.noEntry ?? []).map((point) => rotatePoint(point)),
    omitted: (floor.omitted ?? []).map(({ from, to }) => ({
      from: rotatePoint(from),
      to: rotatePoint(to),
    })),
  })),
)

// One frame holds any floor, so the scale never changes with the floor and a
// change slides the next floor in exactly where the last one was
const frame = computed(() => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const floor of rotatedFloors.value) {
    const bounds = boxBounds([...floor.slab, ...floor.ground], 0, ROOF_HEIGHT)
    minX = Math.min(minX, bounds.minX)
    maxX = Math.max(maxX, bounds.maxX)
    minY = Math.min(minY, bounds.minY)
    maxY = Math.max(maxY, bounds.maxY)
  }
  return {
    x: minX - MARGIN - FLOOR_LABEL_GUTTER,
    y: minY - MARGIN,
    w: maxX - minX + MARGIN * 2 + FLOOR_LABEL_GUTTER,
    h: maxY - minY + MARGIN * 2,
  }
})

// The stack is an overview, fitted whole and left alone; a single floor fills
// whatever box the page gives it, covering it, and zooms and pans
const stacked = computed(() => props.level === 'all')

// Stacked floors sit one frame apart, the top floor uppermost
function floorOffset(level: FloorLevel): number {
  return stacked.value ? -(level - 1) * frame.value.h : 0
}

const viewBoxRect = computed(() => {
  const { x, y, w, h } = frame.value
  const count = stacked.value ? props.floors.length : 1
  return { x, y: y - (count - 1) * h, w, h: h * count }
})

const viewBox = computed(() => {
  const { x, y, w, h } = viewBoxRect.value
  return `${x} ${y} ${w} ${h}`
})

const svgRef = useTemplateRef<SVGSVGElement>('svgRef')
const viewportRef = useTemplateRef<SVGGElement>('viewportRef')
const svgSize = ref({ w: 0, h: 0 })

// The part of the viewBox on screen once the drawing covers the box
const visibleRect = computed(() => {
  const box = viewBoxRect.value
  const { w, h } = svgSize.value
  if (stacked.value || !w || !h) return box
  const elementAspect = w / h
  if (elementAspect < box.w / box.h) {
    const width = box.h * elementAspect
    return { x: box.x + (box.w - width) / 2, y: box.y, w: width, h: box.h }
  }
  const height = box.w / elementAspect
  return { x: box.x, y: box.y + (box.h - height) / 2, w: box.w, h: height }
})

const panZoom = usePanZoom(svgRef, visibleRect, viewBoxRect, {
  initialScale: (view, _content, fit) => (view.w < view.h ? Math.max(fit, PORTRAIT_SCALE) : 1),
})

// The transform goes onto the group by hand, so a pan tick moves one attribute
// instead of rendering every room again
watch(panZoom.transform, (value) => viewportRef.value?.setAttribute('transform', value), {
  flush: 'sync',
})

// A different frame means a different map; the zoom starts over. A box that
// changes size keeps the view the user made, else takes the new default
watch(viewBox, () => panZoom.reset())
watch(visibleRect, () => (panZoom.touched.value ? panZoom.clamp() : panZoom.reset()))

const sizeObserver = new ResizeObserver((entries) => {
  const size = entries[0]?.contentRect
  if (size) svgSize.value = { w: size.width, h: size.height }
})

onMounted(() => {
  viewportRef.value?.setAttribute('transform', panZoom.transform.value)
  if (svgRef.value) sizeObserver.observe(svgRef.value)
})

onBeforeUnmount(() => sizeObserver.disconnect())

interface Label {
  text: string
  x: number
  y: number
  size: number
}

interface DrawnRoom {
  room: MapRoom
  key: string
  top: string
  south?: string
  east?: string
  icon?: { d: string; transform: string }
  linked: boolean
  tooltip: string
  label?: Label
}

// A room nobody runs anything in stays blank, so the numbers that matter stand out
function labelText(room: MapRoom, linked: boolean): string {
  if (room.kind === 'tent') return organizationPlaceLabel(roomPlace(room), locale.value, t)
  if (room.label) return room.label
  if (ROOM_KINDS[room.kind].icon) return ''
  if (room.kind === 'room' && !linked) {
    return room.featured ? localized(room.name, locale.value) : ''
  }
  return roomNumber(room) ?? localized(room.name, locale.value)
}

// Horizontal text sits inside the projected top, whose flat chord through the
// centre is twice the shorter side, so the label shrinks with the room
function labelFor(room: MapRoom, height: number, linked: boolean): Label | undefined {
  const text = labelText(room, linked)
  if (!text) return undefined
  const short = Math.min(room.w, room.h)
  const size = Math.min(MAX_LABEL, (short * 2 - 1) / textWidth(text), short / 1.6)
  if (size < MIN_LABEL) return undefined
  const { x, y } = boxCenter(room, height)
  return { text, x, y, size }
}

// The symbol is a square a bit over half the shorter side, centred on the box
function iconFor(room: MapRoom): DrawnRoom['icon'] {
  const name = ROOM_KINDS[room.kind].icon
  if (!name) return undefined
  const size = Math.min(room.w, room.h) * 0.6
  const { x, y } = boxCenter(room, 0)
  return {
    d: mapIcons[name],
    transform: `translate(${x - size / 2} ${y + size / 2}) scale(${size / ICON_SIZE})`,
  }
}

function tooltipFor(room: MapRoom): string {
  return [roomNumber(room), localized(room.name, locale.value)].filter(Boolean).join(' ')
}

// Flat areas lie on the plate and can hide nothing, so they go down first and
// the boxes standing on the plate paint over them from the back forwards
function drawnRooms(floor: MapFloor): DrawnRoom[] {
  const flat = floor.rooms.filter((room) => ROOM_KINDS[room.kind].height === 0)
  const raised = paintOrder(floor.rooms.filter((room) => ROOM_KINDS[room.kind].height > 0))
  return [...flat, ...raised].map((room, index) => {
    const height = ROOM_KINDS[room.kind].height
    const linked = props.linked.has(room.id)
    return {
      room,
      key: `${room.id}-${index}`,
      top: boxTop(room, height),
      ...(height > 0 ? boxFaces(room, 0, height) : {}),
      icon: iconFor(room),
      linked,
      tooltip: tooltipFor(room),
      label: labelFor(room, height, linked),
    }
  })
}

function grow(box: MapBox): MapBox {
  return { x: box.x - SEAM, y: box.y - SEAM, w: box.w + SEAM * 2, h: box.h + SEAM * 2 }
}

// Sits off the leftmost corner of the plate
function floorLabel(floor: MapFloor): Point {
  const corners = floor.slab.map((box) => project(box.x, box.y + box.h, 0))
  const west = corners.reduce((point, corner) => (corner.x < point.x ? corner : point))
  return { x: west.x - FLOOR_LABEL_GAP, y: west.y }
}

const drawnFloors = computed(() =>
  rotatedFloors.value.map((floor) => {
    const rooms = drawnRooms(floor)
    return {
      floor,
      title: t('explore.map.floor', { level: floor.level }),
      groundTops: floor.ground.map((box) => boxTop(grow(box), 0)),
      slabTops: floor.slab.map((box) => boxTop(grow(box), 0)),
      rooms,
      labels: rooms.filter((entry) => entry.label),
      noEntry: floor.noEntry.map((point) => project(point.x, point.y, 0)),
      omitted: floor.omitted.map(({ from, to }) => ({
        from: project(from.x, from.y, 0),
        to: project(to.x, to.y, 0),
      })),
      label: floorLabel(floor),
    }
  }),
)

const shown = computed(() =>
  stacked.value
    ? drawnFloors.value
    : drawnFloors.value.filter((entry) => entry.floor.level === props.level),
)

const noEntryLabel = computed(() => t('explore.map.noEntry'))

// A higher floor comes down from above, a lower one up from below, whatever
// lies between never passes by; the stack switches without a slide
const slide = ref<'up' | 'down' | 'fade'>('fade')

watch(
  () => props.level,
  (next, prev) => {
    slide.value =
      next === 'all' || prev === 'all' || next === prev ? 'fade' : next > prev ? 'up' : 'down'
  },
)

function isEmphasized(room: MapRoom): boolean {
  return props.emphasized?.includes(room.id) ?? false
}

function onRoomClick(event: MouseEvent, entry: DrawnRoom) {
  if (!entry.linked) return
  event.stopPropagation()
  if (panZoom.wasDragged()) return
  emit('select', entry.room.id)
}

// A click that reaches the svg itself hit nothing selectable
function onBackgroundClick() {
  if (panZoom.wasDragged()) return
  emit('deselect')
}

/** Where a room is drawn on screen, for anchoring things to it */
function roomRect(id: string): DOMRect | undefined {
  return svgRef.value?.querySelector(`.room[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect()
}

defineExpose({
  roomRect,
  zoomBy: panZoom.zoomBy,
  reset: panZoom.reset,
  view: panZoom.transform,
  atDefault: panZoom.atDefault,
})
</script>

<template>
  <svg
    ref="svgRef"
    class="iso-map"
    :class="{ stacked, zoomed: panZoom.zoomed.value }"
    :viewBox="viewBox"
    :preserveAspectRatio="stacked ? 'xMidYMid meet' : 'xMidYMid slice'"
    :style="{ '--slide': `${frame.h}px` }"
    xmlns="http://www.w3.org/2000/svg"
    role="group"
    :aria-label="t('explore.map.mapLabel')"
    v-on="stacked ? {} : panZoom.handlers"
    @click="onBackgroundClick"
  >
    <g ref="viewportRef" class="viewport">
      <TransitionGroup :name="`floor-${slide}`" :css="!stacked" @after-enter="emit('settled')">
        <g
          v-for="{
            floor,
            title,
            groundTops,
            slabTops,
            rooms,
            labels,
            noEntry,
            omitted,
            label,
          } in shown"
          :key="floor.level"
          class="floor"
          :transform="`translate(0 ${floorOffset(floor.level)})`"
        >
          <polygon
            v-for="(points, i) in groundTops"
            :key="`ground-${i}`"
            class="ground"
            :points="points"
          />
          <polygon
            v-for="(points, i) in slabTops"
            :key="`slab-${i}`"
            class="slab"
            :points="points"
          />
          <line
            v-for="({ from, to }, i) in omitted"
            :key="`omitted-${i}`"
            class="omitted"
            :x1="from.x"
            :y1="from.y"
            :x2="to.x"
            :y2="to.y"
          />

          <text class="floor-label" :x="label.x" :y="label.y">{{ title }}</text>

          <g
            v-for="entry in rooms"
            :key="entry.key"
            class="room"
            :class="[
              entry.room.kind,
              ROOM_KINDS[entry.room.kind].surface,
              {
                linked: entry.linked,
                featured: entry.room.featured,
                selected: entry.room.id === selected,
                emphasized: isEmphasized(entry.room),
              },
            ]"
            :data-id="entry.room.id"
            :role="entry.linked ? 'button' : undefined"
            :tabindex="entry.linked ? 0 : undefined"
            :aria-label="entry.linked ? entry.tooltip : undefined"
            @click="onRoomClick($event, entry)"
            @keydown.enter.space.prevent="emit('select', entry.room.id)"
          >
            <title v-if="entry.tooltip">{{ entry.tooltip }}</title>
            <template v-if="entry.south && entry.east">
              <polygon class="face south" :points="entry.south" />
              <polygon class="face east" :points="entry.east" />
            </template>
            <polygon class="top" :points="entry.top" />
            <path
              v-if="entry.icon"
              class="icon"
              :d="entry.icon.d"
              :transform="entry.icon.transform"
            />
          </g>

          <text
            v-for="entry in labels"
            :key="`label-${entry.key}`"
            class="label"
            :class="{
              linked: entry.linked || entry.room.featured,
              selected: entry.room.id === selected,
            }"
            :x="entry.label!.x"
            :y="entry.label!.y"
            :font-size="entry.label!.size"
          >
            {{ entry.label!.text }}
          </text>

          <g
            v-for="(point, i) in noEntry"
            :key="`no-entry-${i}`"
            class="no-entry"
            :transform="`translate(${point.x} ${point.y})`"
          >
            <title>{{ noEntryLabel }}</title>
            <circle r="1.7" />
            <line x1="-1.1" y1="-1.1" x2="1.1" y2="1.1" />
          </g>
        </g>
      </TransitionGroup>
    </g>
  </svg>
</template>

<style scoped>
.iso-map {
  --map-slab: var(--color-background-soft);
  --map-wall: var(--color-border);
  --map-roof: color-mix(in oklab, var(--color-heading) 16%, var(--color-background));
  --map-linked-wall: color-mix(in oklab, var(--color-accent) 45%, var(--color-background));
  --map-linked-wall-hover: color-mix(in oklab, var(--color-accent) 65%, var(--color-background));
  --map-linked-roof: color-mix(in oklab, var(--color-accent) 60%, var(--map-roof));
  --map-linked-roof-hover: color-mix(in oklab, var(--color-accent) 80%, var(--map-roof));
  --map-selected-wall: var(--color-accent);
  --map-selected-roof: color-mix(in oklab, var(--color-accent) 75%, black);
  --map-no-entry: oklch(58% 0.2 25);

  display: block;
  width: 100%;
  height: auto;
  font-family: var(--font-display);
  user-select: none;

  &:not(.stacked) {
    height: 100svh;
    touch-action: pan-y;
  }

  &.zoomed {
    touch-action: none;
    cursor: grab;
  }

  &.stacked {
    max-width: 1024px;
    margin-inline: auto;
  }

  .floor-up-enter-active,
  .floor-up-leave-active,
  .floor-down-enter-active,
  .floor-down-leave-active {
    transition:
      transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.35s ease-out;
  }

  .floor-fade-enter-active,
  .floor-fade-leave-active {
    transition: opacity 0.25s ease-out;
  }

  .floor-up-enter-from,
  .floor-down-leave-to {
    transform: translateY(calc(-1 * var(--slide)));
    opacity: 0;
  }

  .floor-up-leave-to,
  .floor-down-enter-from {
    transform: translateY(var(--slide));
    opacity: 0;
  }

  .floor-fade-enter-from,
  .floor-fade-leave-to {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .floor-up-enter-from,
    .floor-up-leave-to,
    .floor-down-enter-from,
    .floor-down-leave-to {
      transform: none;
    }
  }

  .ground {
    fill: color-mix(in oklab, var(--color-heading) 4%, var(--color-background));
  }

  .slab {
    fill: var(--map-slab);
  }

  .omitted {
    stroke: var(--color-text-mute);
    stroke-width: 0.3;
    stroke-dasharray: 1 0.8;
    stroke-linecap: round;
  }

  .floor-label {
    fill: var(--color-text-mute);
    font-size: 4px;
    text-anchor: end;
    dominant-baseline: central;
    letter-spacing: 0.02em;
  }

  .room {
    .top {
      fill: var(--map-roof);
      stroke: var(--map-roof);
      stroke-width: 0.15;
      stroke-linejoin: round;
      transition:
        fill 0.15s,
        stroke 0.15s;
    }

    .face {
      fill: var(--map-wall);
      transition: fill 0.15s;
    }

    .icon {
      fill: var(--color-text-mute);
      pointer-events: none;
    }

    &.flat .top {
      fill: color-mix(in oklab, var(--color-heading) 6%, var(--map-slab));
    }

    &.outline .top {
      fill: var(--map-slab);
      stroke: var(--map-wall);
      stroke-width: 0.3;
    }

    &.void .top {
      fill: none;
      stroke-dasharray: 0.6 0.4;
    }

    &.tent .top {
      stroke-width: 0.25;
    }

    &.linked,
    &.featured {
      .top {
        fill: var(--map-linked-roof);
        stroke: var(--map-linked-roof);
      }

      .face {
        fill: var(--map-linked-wall);
      }
    }

    &.linked {
      cursor: pointer;
      outline: none;

      &:not(.selected):is(:hover, :focus-visible) {
        .top {
          fill: var(--map-linked-roof-hover);
          stroke: var(--map-linked-roof-hover);
        }

        .face {
          fill: var(--map-linked-wall-hover);
        }
      }
    }

    &.selected {
      .top {
        fill: var(--map-selected-roof);
        stroke: var(--map-selected-roof);
      }

      .face {
        fill: var(--map-selected-wall);
      }
    }

    &.emphasized .top {
      stroke: var(--color-heading);
      stroke-width: 0.45;
    }
  }

  .label {
    fill: var(--color-text-mute);
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
    paint-order: stroke;
    stroke-linejoin: round;

    &.linked {
      fill: var(--color-heading);
      stroke: var(--map-linked-roof);
      stroke-width: 0.35;
    }

    &.selected {
      fill: var(--vt-c-white);
      stroke: none;
    }
  }

  .no-entry {
    circle {
      fill: var(--color-background);
      stroke: var(--map-no-entry);
      stroke-width: 0.5;
    }

    line {
      stroke: var(--map-no-entry);
      stroke-width: 0.5;
      stroke-linecap: round;
    }
  }
}
</style>
