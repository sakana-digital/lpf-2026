<script setup lang="ts">
import SearchIcon from '../assets/search.vue'
import { useSearch } from '../composables/useSearch'

const { open } = useSearch()
</script>

<template>
  <main class="not-found">
    <p class="description">{{ $t('notFound.description') }}</p>
    <button type="button" class="search-trigger" @click="open">
      <SearchIcon />
      {{ $t('notFound.search') }}
    </button>
    <p class="search-hint">{{ $t('notFound.searchHint') }}</p>
  </main>
</template>

<style scoped>
.not-found {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  text-align: center;

  & .description {
    font-size: clamp(2rem, 8vw, 3.5rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.3;
    white-space: pre-line;
    color: var(--color-heading);
  }

  & .search-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 1rem;
    border: none;
    background: transparent;
    color: var(--color-accent);
    font-size: 1rem;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  & .search-hint {
    margin: 0;
    color: var(--color-text-mute);
    font-size: 0.875rem;
  }
}
</style>
