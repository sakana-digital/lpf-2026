<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const homePath = computed(() => (route.meta.locale === 'en' ? '/en' : '/'))
</script>

<template>
  <main class="not-found">
    <p class="description">{{ $t('notFound.description') }}</p>
    <RouterLink :to="homePath" class="home">{{ $t('notFound.home') }}</RouterLink>
  </main>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 70vh;
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

  & .home {
    margin-top: 1rem;
    color: var(--color-accent);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
