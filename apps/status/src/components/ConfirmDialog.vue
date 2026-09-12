<script setup lang="ts">
import { ref, watch } from 'vue'
import { css } from '@styled/css'
import { button } from '@styled/recipes'

const props = withDefaults(
  defineProps<{
    open: boolean
    message: string
    confirmLabel: string
    tone?: 'danger' | 'primary'
  }>(),
  { tone: 'danger' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) dialog.value?.showModal()
    else dialog.value?.close()
  },
)

function onClose() {
  if (props.open) emit('cancel')
}

const styles = {
  dialog: css({
    margin: 'auto',
    padding: '24px 20px 20px',
    width: 'min(320px, calc(100vw - 40px))',
    border: '1px solid token(colors.border)',
    background: 'surface',
    color: 'text',
    '&::backdrop': { background: 'scrim' },
  }),
  message: css({ fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-line' }),
  actions: css({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginTop: '20px',
  }),
}
</script>

<template>
  <dialog ref="dialog" :class="styles.dialog" @close="onClose" @cancel.prevent="emit('cancel')">
    <p :class="styles.message">{{ message }}</p>
    <div :class="styles.actions">
      <button type="button" :class="button({ variant: 'outline' })" @click="emit('cancel')">
        キャンセル
      </button>
      <button type="button" :class="button({ variant: tone })" @click="emit('confirm')">
        {{ confirmLabel }}
      </button>
    </div>
  </dialog>
</template>
