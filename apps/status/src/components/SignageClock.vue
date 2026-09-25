<script setup lang="ts">
import { computed } from 'vue'
import { jstTime } from '@shared/timetable'
import { useNow } from '@/composables/useNow'
import { css, cva } from '@styled/css'

// Its own component so the per-second tick re-renders only the digits.
const props = defineProps<{ offset: number }>()

const now = useNow(() => props.offset)
const time = computed(() => jstTime(now.value))
const colonShown = computed(() => now.value.getSeconds() % 2 === 1)

const styles = {
  clock: css({
    fontSize: '2.6cqw',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.04em',
    lineHeight: 1,
  }),
  colon: cva({
    base: { position: 'relative', top: '-0.1em' },
    variants: { shown: { true: {}, false: { visibility: 'hidden' } } },
  }),
}
</script>

<template>
  <time :class="styles.clock">
    <template v-for="(unit, i) in time" :key="i">
      <span v-if="i > 0" :class="styles.colon({ shown: colonShown })">:</span>{{ unit }}
    </template>
  </time>
</template>
