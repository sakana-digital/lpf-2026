<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { NewsItem } from '@/config/newsLinks'
import InstagramEmbed from '@/components/news/InstagramEmbed.vue'
import NewsLinkCard from '@/components/news/NewsLinkCard.vue'
import { processInstagramEmbedsNear } from '@/lib/instagramEmbed'
import { useMasonryLayout } from '@/composables/useMasonryLayout'

const LANE_MIN_WIDTH = 318
const LANE_MAX_WIDTH = 540
const LANE_GAP = 16

const props = defineProps<{
  items: NewsItem[]
}>()

const { t } = useI18n()

const wrapper = ref<HTMLElement | null>(null)
const { positions, gridHeight, laneWidth } = useMasonryLayout(wrapper, props.items.length, {
  laneWidth: LANE_MIN_WIDTH,
  maxLaneWidth: LANE_MAX_WIDTH,
  gap: LANE_GAP,
  maxLanes: Math.min(3, props.items.length),
  itemSelector: '.lane-item',
})

const gridStyle = computed(() => ({
  height: `${gridHeight.value}px`,
}))

const itemStyle = (i: number) => {
  const pos = positions.value[i] ?? { x: 0, y: 0 }
  return {
    width: `${laneWidth.value}px`,
    transform: `translate(${pos.x}px, ${pos.y}px)`,
  }
}

let stopEmbedObserver: (() => void) | undefined

onMounted(() => {
  if (wrapper.value) stopEmbedObserver = processInstagramEmbedsNear(wrapper.value)
})

onBeforeUnmount(() => stopEmbedObserver?.())
</script>

<template>
  <div ref="wrapper" class="news-links">
    <div v-if="props.items.length > 0" class="links-grid" :style="gridStyle">
      <div
        v-for="(item, i) in props.items"
        :key="item.url"
        class="lane-item"
        :data-index="i"
        :style="itemStyle(i)"
      >
        <InstagramEmbed v-if="item.type === 'instagram'" :url="item.url" />
        <NewsLinkCard v-else :url="item.url" :title-key="item.titleKey" :source="item.source" />
      </div>
    </div>
    <p v-else class="no-posts">{{ t('news.noPosts') }}</p>
  </div>
</template>

<style scoped>
.news-links {
  width: 100%;

  .links-grid {
    position: relative;
    width: 100%;

    .lane-item {
      position: absolute;
      top: 0;
      left: 0;
    }
  }

  .no-posts {
    text-align: center;
    color: var(--color-text-mute);
  }
}
</style>
