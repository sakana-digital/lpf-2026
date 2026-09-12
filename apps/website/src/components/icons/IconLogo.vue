<script setup lang="ts">
import logo from '../../../../../design/logo.svg?raw'
</script>

<template>
  <span class="logo" role="img" aria-label="八宝祭" v-html="logo" />
</template>

<style scoped>
.logo {
  display: inline-flex;
  flex-shrink: 0;

  & :deep(svg) {
    box-sizing: border-box;
    width: auto;
    height: 20px;
    padding: 2px;
    background-color: var(--color-heading);
    transition: all 0.25s;
  }

  /* The exported path carries fill="none", which beats inheritance. */
  & :deep(path) {
    fill: var(--color-background);
  }
}
</style>
