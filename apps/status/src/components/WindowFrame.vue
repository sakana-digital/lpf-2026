<script setup lang="ts">
import { css, cva } from '@styled/css'

withDefaults(defineProps<{ title?: string; subtitle?: string; bordered?: boolean }>(), {
  title: undefined,
  subtitle: undefined,
  bordered: true,
})

const styles = {
  window: cva({
    base: {
      containerName: 'admin-window',
      containerType: 'inline-size',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      background: 'surface',
    },
    variants: {
      bordered: {
        true: { border: '1px solid token(colors.border)' },
        false: {},
      },
    },
  }),
  bar: css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    flexShrink: 0,
    height: '40px',
    padding: '0 12px 0 14px',
    borderBottom: '1px solid token(colors.border)',
  }),
  title: css({
    minWidth: 0,
    fontSize: '13px',
    fontWeight: 'bold',
    letterSpacing: '0.06em',
    truncate: true,
  }),
  subtitle: css({
    minWidth: 0,
    color: 'textMute',
    fontSize: '13px',
    fontWeight: 'bold',
    truncate: true,
  }),
  // A single stretch row, so whatever is slotted in fills the window without being styled here.
  body: css({
    display: 'grid',
    gridTemplateRows: 'minmax(0, 1fr)',
    flex: 1,
    minWidth: 0,
    padding: '18px 16px 16px',
  }),
}
</script>

<template>
  <section :class="styles.window({ bordered })">
    <header v-if="title" :class="styles.bar">
      <h2 :class="styles.title">{{ title }}</h2>
      <span v-if="subtitle" :class="styles.subtitle">{{ subtitle }}</span>
    </header>
    <div :class="styles.body">
      <slot />
    </div>
  </section>
</template>
