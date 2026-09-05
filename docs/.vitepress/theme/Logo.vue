<script setup lang="ts">
import logo from '../../../design/logo.svg?raw'
</script>

<template>
  <span class="site-logo" v-html="logo" />
</template>

<style scoped>
.site-logo {
  display: inline-flex;
  margin-right: 8px;
}

/* v-html content carries no scope attribute, so it needs :deep at the top level. */
.site-logo :deep(svg) {
  box-sizing: border-box;
  width: auto;
  height: 20px;
  padding: 2px;
  background-color: var(--vp-c-text-1);
  transition: background-color 0.25s;
}

/* The exported path carries fill="none", which beats inheritance. */
.site-logo :deep(path) {
  fill: var(--vp-c-bg);
}
</style>
