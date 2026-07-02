<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { pages } from '../config/pages'
import { filterEntries, useSearch } from '../composables/useSearch'

const { t, locale, messages, availableLocales } = useI18n()
const { isOpen, close } = useSearch()
const router = useRouter()

const query = ref('')
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const resultRefs = ref<{ $el: HTMLElement }[]>([])

function resolvePath(tree: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      tree,
    )
}

// 全ロケールのキーワードと表示名を集めて、どちらの言語でもマッチさせる
const entries = computed(() =>
  pages.map((page) => {
    const keywords: string[] = []
    for (const loc of availableLocales) {
      const tree = (messages.value as Record<string, unknown>)[loc]
      const kw = page.keywordsKey ? resolvePath(tree, page.keywordsKey) : undefined
      if (Array.isArray(kw)) keywords.push(...(kw as string[]))
      const title = resolvePath(tree, page.titleKey ?? page.labelKey)
      if (typeof title === 'string') keywords.push(title)
    }
    return {
      to: locale.value === 'en' ? (page.path === '/' ? '/en' : `/en${page.path}`) : page.path,
      label: t(page.titleKey ?? page.labelKey),
      keywords,
    }
  }),
)

const hasQuery = computed(() => query.value.trim() !== '')
const results = computed(() => filterEntries(query.value, entries.value))

const activeIndex = ref(0)

watch(results, () => {
  activeIndex.value = 0
})

function moveFocus(delta: number) {
  const count = results.value.length
  if (count === 0) return

  if (delta < 0 && activeIndex.value === 0) {
    inputRef.value?.focus()
    return
  }

  activeIndex.value = (((activeIndex.value + delta) % count) + count) % count
  resultRefs.value[activeIndex.value]?.$el?.focus()
}

function selectActive() {
  const entry = results.value[activeIndex.value]
  if (!entry) return
  router.push(entry.to)
  close()
}

watch(isOpen, (open) => {
  if (!open) return
  query.value = ''
  activeIndex.value = 0
  nextTick(() => inputRef.value?.focus())
})
</script>

<template>
  <Transition name="search">
    <div v-if="isOpen" class="search-modal">
      <div class="backdrop" @click="close" />
      <div class="panel" role="dialog" :aria-label="t('search.label')">
        <input
          ref="inputRef"
          v-model="query"
          type="search"
          class="field"
          :placeholder="t('search.placeholder')"
          :aria-label="t('search.label')"
          @keydown.down.prevent="moveFocus(1)"
          @keydown.up.prevent="moveFocus(-1)"
          @keydown.enter.prevent="selectActive"
        />
        <div class="body" :class="{ open: hasQuery }">
          <div class="body-inner">
            <template v-if="hasQuery">
              <ul v-if="results.length" class="results">
                <li v-for="(entry, index) in results" :key="entry.to">
                  <RouterLink
                    ref="resultRefs"
                    :to="entry.to"
                    class="result"
                    :class="{ active: index === activeIndex }"
                    @click="close"
                    @mouseenter="activeIndex = index"
                    @focus="activeIndex = index"
                    @keydown.down.prevent="moveFocus(1)"
                    @keydown.up.prevent="moveFocus(-1)"
                    >{{ entry.label }}</RouterLink
                  >
                </li>
              </ul>
              <p v-else class="empty">{{ t('search.empty') }}</p>
            </template>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 96px 16px 16px;

  .backdrop {
    position: absolute;
    inset: 0;
  }

  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 480px;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 28px;
    background: var(--color-background);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
  }

  .field {
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-heading);
    font-size: 16px;
    outline: none;

    &::placeholder {
      color: var(--color-text-mute);
    }
  }

  .body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.22s ease-out;

    &.open {
      grid-template-rows: 1fr;
    }

    .body-inner {
      overflow: hidden;
    }
  }

  .results {
    display: flex;
    flex-direction: column;
    gap: 4px;
    list-style: none;
    margin: 4px 0 0;
    padding: 0;

    .result {
      display: block;
      padding: 8px 12px;
      border-radius: 20px;
      color: var(--color-text);
      text-decoration: none;

      &:focus {
        outline: none;
      }

      &.active {
        background: var(--color-background-mute);
      }
    }
  }

  .empty {
    margin: 4px 0 0;
    padding: 8px 12px;
    color: var(--color-text-mute);
    font-size: 14px;
  }
}

.search-enter-active,
.search-leave-active {
  transition: opacity 0.16s ease-out;
}

.search-enter-active .panel {
  animation: search-pop 0.26s ease-out;
}

.search-leave-active .panel {
  transition: transform 0.16s ease-out;
}

.search-enter-from,
.search-leave-to {
  opacity: 0;
}

.search-leave-to .panel {
  transform: scale(1.04);
}

@keyframes search-pop {
  0% {
    transform: scale(1.04);
  }

  55% {
    transform: scale(0.99);
  }

  100% {
    transform: scale(1);
  }
}
</style>
