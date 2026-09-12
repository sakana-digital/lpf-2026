<script setup lang="ts">
import logo from '../../../../design/logo.svg?raw'
import { css } from '@styled/css'

const styles = {
  logo: css({
    display: 'inline-flex',
    flexShrink: 0,
    '& svg': {
      boxSizing: 'border-box',
      width: 'auto',
      height: '20px',
      padding: '2px',
      background: 'accent',
    },
    // The exported path carries fill="none", which beats inheritance.
    '& path': { fill: 'onAccent' },
  }),
}
</script>

<template>
  <span :class="styles.logo" role="img" aria-label="八宝祭" v-html="logo" />
</template>
