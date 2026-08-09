<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useScrollSpy } from '@/composables/useScrollSpy'

const { t } = useI18n()

defineProps<{ entrance?: boolean }>()

const items = [
  { id: 'top', labelKey: 'home.toc.top' },
  { id: 'overview', labelKey: 'home.toc.overview' },
  { id: 'access', labelKey: 'home.toc.access' },
  { id: 'news', labelKey: 'home.toc.news' },
  { id: 'notes', labelKey: 'home.toc.notes' },
  { id: 'contact', labelKey: 'home.toc.contact' },
] as const

const { activeId, select } = useScrollSpy(items.map((item) => item.id))

function jumpTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  select(id)
  // Reflect the target in the URL without letting the router treat the hash as a
  // navigation, which would fight the smooth scroll below.
  history.replaceState(history.state, '', `#${id}`)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
</script>

<template>
  <aside class="toc" :class="{ 'is-entrance': entrance }">
    <nav class="toc-nav" :aria-label="t('home.toc.toggle')">
      <ul class="toc-list">
        <li v-for="item in items" :key="item.id">
          <button
            class="toc-link"
            :class="{ 'is-active': activeId === item.id }"
            :aria-current="activeId === item.id ? 'true' : undefined"
            @click="jumpTo(item.id)"
          >
            <span class="toc-tick"><span class="toc-tick-bar"></span></span>
            <span class="toc-label">{{ t(item.labelKey) }}</span>
          </button>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.toc {
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  z-index: 101;
  display: none;
  align-items: center;
  justify-content: center;
  width: calc((100vw - min(1024px, 100vw)) / 2);

  /* Only reveal when the right gutter is wide enough to hold the toc
     without overlapping the centered content column. */
  @media (min-width: 1440px) {
    display: flex;
  }
}

.toc-nav {
  transition:
    opacity 0.25s,
    transform 0.25s;

  .is-entrance & {
    animation: toc-reveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

@keyframes toc-reveal {
  from {
    opacity: 0;
    transform: translateX(16px);
    filter: blur(8px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
    filter: blur(0);
  }
}

.toc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text-mute);
  font-size: 15px;
  cursor: pointer;
  transition: color 0.15s;

  &:hover {
    color: var(--color-heading);
  }

  .toc-tick {
    display: flex;
    align-items: center;
    /* Fixed slot: the bar grows inside it so the label never shifts and the
       centered nav keeps a constant width. */
    width: 32px;

    .toc-tick-bar {
      width: 24px;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
      opacity: 0.5;
      transition:
        opacity 0.2s,
        width 0.2s;
    }
  }

  .toc-label {
    white-space: nowrap;
  }

  &.is-active {
    color: var(--color-heading);

    .toc-tick .toc-tick-bar {
      width: 32px;
      opacity: 1;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .toc.is-entrance .toc-nav {
    animation: none;
  }

  .toc-nav,
  .toc-link,
  .toc-link .toc-tick-bar {
    transition: none;
  }
}
</style>
