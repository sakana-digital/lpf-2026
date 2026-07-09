<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

interface Tab {
  to: string
  label: string
}

const props = defineProps<{
  tabs: Tab[]
  ariaLabel?: string
}>()

const route = useRoute()

const navRef = ref<HTMLElement | null>(null)
const indicatorStyle = ref({ transform: 'translateX(0px)', width: '0px' })

let observedTab: HTMLElement | null = null
const resizeObserver = new ResizeObserver(updateIndicator)

function updateIndicator() {
  const active = navRef.value?.querySelector<HTMLElement>('.router-link-active')
  if (!active) return

  indicatorStyle.value = {
    transform: `translateX(${active.offsetLeft}px)`,
    width: `${active.offsetWidth}px`,
  }

  if (active !== observedTab) {
    if (observedTab) resizeObserver.unobserve(observedTab)
    resizeObserver.observe(active)
    observedTab = active
  }
}

onMounted(updateIndicator)

onBeforeUnmount(() => resizeObserver.disconnect())

watch(
  () => [route.path, props.tabs] as const,
  () => nextTick(updateIndicator),
  { deep: true },
)
</script>

<template>
  <nav ref="navRef" class="tab-bar" :aria-label="ariaLabel">
    <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="tab">
      {{ tab.label }}
    </RouterLink>
    <span class="indicator" :style="indicatorStyle" />
  </nav>
</template>

<style scoped>
.tab-bar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .tab {
    flex-shrink: 0;
    padding-bottom: 2px;
    white-space: nowrap;
    color: var(--color-text-mute);
    transition: color 0.15s;

    &:hover {
      color: var(--color-heading);
    }

    &.router-link-active {
      color: var(--color-heading);
    }
  }

  .indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: var(--color-heading);
    transition:
      transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
      width 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
}
</style>
