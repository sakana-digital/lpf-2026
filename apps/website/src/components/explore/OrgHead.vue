<script setup lang="ts">
defineProps<{
  expanded: boolean
  /** Just the heading, when there is nothing to open or close */
  plain?: boolean
}>()

defineEmits<{ toggle: [] }>()
</script>

<template>
  <div class="org-head">
    <div v-if="plain" class="org-trigger plain">
      <slot></slot>
    </div>
    <button
      v-else
      type="button"
      class="org-trigger"
      :aria-expanded="expanded"
      @click="$emit('toggle')"
    >
      <slot></slot>
    </button>
    <slot name="meta"></slot>
  </div>
</template>

<style scoped>
.org-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.org-trigger {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  /* Stretch the hit area over the whole positioned row around it */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  &.plain {
    cursor: default;

    &::after {
      content: none;
    }
  }
}
</style>
