<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { readStored, writeStored } from '@/lib/storage'

const STORAGE_KEY = 'payment-notice-dismissed'

const { t } = useI18n()

const visible = ref(false)

// 一度閉じたら再訪時も出さない。保存値の読み出しは描画後に行い、初期表示をブロックしない
onMounted(() => {
  visible.value = readStored(STORAGE_KEY) !== 'true'
})

function dismiss() {
  visible.value = false
  writeStored(STORAGE_KEY, 'true')
}
</script>

<template>
  <Transition name="payment-notice">
    <aside
      v-if="visible"
      class="payment-notice"
      role="dialog"
      :aria-label="t('paymentNotice.title')"
    >
      <p class="message">{{ t('paymentNotice.message') }}</p>
      <button type="button" class="close" :aria-label="t('paymentNotice.close')" @click="dismiss">
        ×
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.payment-notice {
  position: fixed;
  right: 16px;
  bottom: max(24px, env(safe-area-inset-bottom));
  z-index: 160;
  display: flex;
  align-items: start;
  gap: 12px;
  width: min(320px, calc(100vw - 32px));
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-background);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);

  @media (max-width: 600px) {
    left: 16px;
    bottom: calc(max(24px, env(safe-area-inset-bottom)) + 100px);
    width: auto;
  }

  .message {
    margin: 0;
    flex: 1;
    font-size: 13px;
    line-height: 1.6;
    color: var(--color-text);
  }

  .close {
    flex-shrink: 0;
    padding: 0 4px;
    border: none;
    background: transparent;
    color: var(--color-text-mute);
    font: inherit;
    font-size: 16px;
    line-height: 1.4;
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: var(--color-heading);
    }
  }
}

.payment-notice-enter-active {
  transition:
    opacity 0.3s ease-out,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.payment-notice-leave-active {
  transition:
    opacity 0.16s ease-out,
    transform 0.16s ease-out;
}

.payment-notice-enter-from,
.payment-notice-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (prefers-reduced-motion: reduce) {
  .payment-notice-enter-active,
  .payment-notice-leave-active {
    transition: opacity 0.2s;
  }

  .payment-notice-enter-from,
  .payment-notice-leave-to {
    transform: none;
  }
}
</style>
