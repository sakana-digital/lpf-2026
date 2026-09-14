<script setup lang="ts">
import { css, cx } from '@styled/css'
import { hint } from '@styled/recipes'

// The access token rides in this app's URL, so the docs must not see it as a referrer.
const docsUrl = 'https://sakana-digital.github.io/lpf-2026/ja/'

const styles = {
  footer: css({
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0,
    padding:
      '0 max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))',
  }),
  link: cx(
    hint(),
    css({
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
      transition: 'color token(durations.base) ease',
      _hover: { color: 'text' },
    }),
  ),
}
</script>

<template>
  <footer :class="styles.footer">
    <a :class="styles.link" :href="docsUrl" target="_blank" rel="noreferrer">使い方を見る</a>
  </footer>
</template>
