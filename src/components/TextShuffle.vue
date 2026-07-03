<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  text: string
}>()

const SHUFFLE_CHARS = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const displayText = ref(props.text)
let frameId: number | undefined

function randomChar() {
  return SHUFFLE_CHARS[Math.floor(Math.random() * SHUFFLE_CHARS.length)]
}

const DURATION_MS = 400

function shuffleTo(target: string) {
  if (frameId !== undefined) cancelAnimationFrame(frameId)

  const startTime = performance.now()

  function step(now: number) {
    const progress = Math.min((now - startTime) / DURATION_MS, 1)
    const revealCount = Math.floor(progress * target.length)
    displayText.value = target
      .split('')
      .map((char, i) => (i < revealCount ? char : randomChar()))
      .join('')

    if (progress < 1) {
      frameId = requestAnimationFrame(step)
    } else {
      displayText.value = target
      frameId = undefined
    }
  }

  frameId = requestAnimationFrame(step)
}

watch(() => props.text, shuffleTo, { immediate: true })

onBeforeUnmount(() => {
  if (frameId !== undefined) cancelAnimationFrame(frameId)
})
</script>

<template>
  <span>{{ displayText }}</span>
</template>
