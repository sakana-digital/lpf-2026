<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: { value: T; label: string }[]
  modelValue: T
}>()

defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="segmented-switch" role="group">
    <button
      v-for="option in options"
      :key="option.value"
      :class="{ active: option.value === modelValue }"
      :aria-pressed="option.value === modelValue"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented-switch {
  display: flex;
  gap: 8px;

  button {
    padding: 6px 16px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;

    &:hover {
      border-color: var(--color-border-hover);
      color: var(--color-heading);
    }

    &.active {
      background: var(--color-heading);
      border-color: var(--color-heading);
      color: var(--color-background);
    }
  }
}
</style>
