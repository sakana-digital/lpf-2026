<script setup lang="ts">
defineProps<{ open?: boolean }>()
</script>

<template>
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    :class="{ 'is-open': open }"
  >
    <line class="bar bar-top" x1="3" y1="6" x2="13" y2="6" />
    <line class="bar bar-bottom" x1="3" y1="10" x2="13" y2="10" />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 16px;
  height: 16px;

  .bar {
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.25s ease;
  }

  &.is-open {
    .bar-top {
      transform: translateY(2px) rotate(45deg);
    }

    .bar-bottom {
      transform: translateY(-2px) rotate(-45deg);
    }
  }
}
</style>
