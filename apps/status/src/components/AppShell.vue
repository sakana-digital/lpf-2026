<script setup lang="ts">
import SiteLogo from '@/components/SiteLogo.vue'
import { css, cva } from '@styled/css'

withDefaults(defineProps<{ narrow?: boolean; header?: boolean }>(), {
  narrow: false,
  header: false,
})

const styles = {
  shell: css({
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100svh',
  }),
  header: css({
    position: 'sticky',
    top: 0,
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    minHeight: '48px',
    padding:
      'env(safe-area-inset-top) max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left))',
    background: 'surface',
    whiteSpace: 'nowrap',
  }),
  main: css({
    flex: 1,
    minWidth: 0,
    padding:
      '20px max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))',
    containerName: 'workspace',
    containerType: 'inline-size',
  }),
  content: cva({
    base: {},
    variants: {
      narrow: {
        true: { maxWidth: '480px', margin: '0 auto' },
        false: {},
      },
    },
  }),
}
</script>

<template>
  <div :class="styles.shell">
    <header v-if="header" :class="styles.header">
      <SiteLogo />
      <slot name="header" />
    </header>
    <main :class="styles.main">
      <div :class="styles.content({ narrow })">
        <slot />
      </div>
    </main>
  </div>
</template>
