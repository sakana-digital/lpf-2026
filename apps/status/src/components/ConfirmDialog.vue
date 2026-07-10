<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  open: boolean
  message: string
  confirmLabel: string
}>()

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
</script>

<template>
  <dialog ref="dialog" class="confirm-dialog" @close="onClose" @cancel.prevent="emit('cancel')">
    <p class="message">{{ message }}</p>
    <div class="actions">
      <button type="button" class="cancel" @click="emit('cancel')">キャンセル</button>
      <button type="button" class="confirm" @click="emit('confirm')">{{ confirmLabel }}</button>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  margin: auto;
  padding: 24px 20px 20px;
  width: min(320px, calc(100vw - 40px));
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);

  &::backdrop {
    background: oklch(0% 0 0 / 0.6);
  }

  .message {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.7;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 20px;

    button {
      padding: 11px 4px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition:
        background 0.18s ease,
        transform 0.1s ease;

      &:active {
        transform: scale(0.96);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
    }

    .cancel {
      border: 1px solid var(--color-border);
      color: var(--color-text-mute);
    }

    .confirm {
      border: 1px solid var(--color-status-soldout);
      background: var(--color-status-soldout);
      color: #fff;
    }
  }
}
</style>
