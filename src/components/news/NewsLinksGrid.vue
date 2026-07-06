<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { newsLinks } from '@/config/newsLinks'
import InstagramEmbed from '@/components/news/InstagramEmbed.vue'
import NewsLinkCard from '@/components/news/NewsLinkCard.vue'
import { processInstagramEmbeds } from '@/composables/useInstagramEmbed'
import { useMasonryLayout } from '@/composables/useMasonryLayout'

const LANE_MIN_WIDTH = 318
const LANE_MAX_WIDTH = 540
const LANE_GAP = 16

const { t } = useI18n()

const wrapper = ref<HTMLElement | null>(null)
const { positions, gridWidth, gridHeight, laneWidth } = useMasonryLayout(
  wrapper,
  newsLinks.length,
  {
    laneWidth: LANE_MIN_WIDTH,
    maxLaneWidth: LANE_MAX_WIDTH,
    gap: LANE_GAP,
    maxLanes: Math.min(3, newsLinks.length),
    itemSelector: '.lane-item',
  },
)

const gridStyle = computed(() => ({
  width: `${gridWidth.value}px`,
  height: `${gridHeight.value}px`,
}))

const itemStyle = (i: number) => {
  const pos = positions.value[i] ?? { x: 0, y: 0 }
  return {
    width: `${laneWidth.value}px`,
    transform: `translate(${pos.x}px, ${pos.y}px)`,
  }
}

onMounted(processInstagramEmbeds)
</script>

<template>
  <div ref="wrapper" class="news-links">
    <div v-if="newsLinks.length > 0" class="links-grid" :style="gridStyle">
      <div
        v-for="(item, i) in newsLinks"
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
  padding: 16px;

  .links-grid {
    position: relative;
    margin: 0 auto;

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
