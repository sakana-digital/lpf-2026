<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { localized } from '@shared/locale'
import { keywordsKey, labelKey, localePath, navigablePages, pagePath, titleKey } from '@/data/pages'
import { organizations } from '@/data/organizations'
import type { Organization } from '@/data/organizations'
import { useSearch } from '@/stores/search'
import { filterEntries, groupEntries } from '@/lib/search'
import type { SearchEntry } from '@/lib/search'
import {
  categoryLabelKey,
  divisionLabelKey,
  organizationGroupName,
  organizationPlaceLabel,
  organizationProjectName,
} from '@/lib/organization'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useScrollLock } from '@/composables/useScrollLock'

const { t, te, locale, messages, availableLocales } = useI18n()
const { isOpen, close } = useSearch()
const router = useRouter()

const query = ref('')
const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const panelRef = useTemplateRef<HTMLElement>('panelRef')

function resolvePath(tree: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      tree,
    )
}

// Collect keywords and names from every locale, so either language matches
const pageEntries = computed<SearchEntry[]>(() =>
  navigablePages.map((page) => {
    const heading = te(titleKey(page.id)) ? titleKey(page.id) : labelKey(page.id)
    const keywords: string[] = []
    for (const loc of availableLocales) {
      const tree = (messages.value as Record<string, unknown>)[loc]
      const kw = resolvePath(tree, keywordsKey(page.id))
      if (Array.isArray(kw)) keywords.push(...(kw as string[]))
      const title = resolvePath(tree, heading)
      if (typeof title === 'string') keywords.push(title)
    }
    return {
      to: localePath(page.path, locale.value),
      section: 'pages',
      label: t(heading),
      keywords,
    }
  }),
)

function orgKeywords(org: Organization): string[] {
  const keywords = [org.id]
  for (const loc of availableLocales) {
    // Same lookup as the display name, but pinned to the other locale
    const translate = (key: string, params?: Record<string, unknown>) =>
      t(key, params ?? {}, { locale: loc })
    keywords.push(
      organizationGroupName(org, loc, translate),
      organizationPlaceLabel(org.place, loc, translate),
      localized(org.project, loc),
      localized(org.description, loc),
      org.division ? translate(divisionLabelKey(org.division)) : '',
      org.category ? translate(categoryLabelKey(org.category)) : '',
    )
    for (const item of org.menus ?? []) {
      keywords.push(localized(item.name, loc))
      keywords.push(...(item.allergens ?? []).map((allergen) => translate(`allergens.${allergen}`)))
    }
  }
  return keywords.filter(Boolean)
}

const orgEntries = computed<SearchEntry[]>(() =>
  organizations.map((org) => ({
    to: `${localePath(pagePath('events'), locale.value)}?org=${org.id}`,
    section: 'orgs',
    label: organizationGroupName(org, locale.value, t),
    sub: organizationProjectName(org, locale.value),
    keywords: orgKeywords(org),
  })),
)

const hasQuery = computed(() => query.value.trim() !== '')

// Sections carry the flat index so arrow keys stay in render order
const sections = computed(() => {
  let index = 0
  return groupEntries(filterEntries(query.value, [...pageEntries.value, ...orgEntries.value])).map(
    (group) => ({
      section: group.section,
      items: group.entries.map((entry) => ({ entry, index: index++ })),
    }),
  )
})

const results = computed(() => sections.value.flatMap((group) => group.items.map((i) => i.entry)))

const activeIndex = ref(0)

watch(results, () => {
  activeIndex.value = 0
})

// Refs collected inside v-for come back unordered, so read the rendered order
function focusResult(index: number) {
  panelRef.value?.querySelectorAll<HTMLElement>('.result')[index]?.focus()
}

function moveFocus(delta: number) {
  const count = results.value.length
  if (count === 0) return

  // Leaving the input lands on the highlighted entry instead of stepping past it
  if (document.activeElement === inputRef.value) {
    activeIndex.value = delta > 0 ? activeIndex.value : count - 1
    focusResult(activeIndex.value)
    return
  }

  if (delta < 0 && activeIndex.value === 0) {
    inputRef.value?.focus()
    return
  }

  activeIndex.value = (((activeIndex.value + delta) % count) + count) % count
  focusResult(activeIndex.value)
}

function selectActive() {
  const entry = results.value[activeIndex.value]
  if (!entry) return
  router.push(entry.to)
  close()
}

useFocusTrap(panelRef, isOpen)
useScrollLock(isOpen)

watch(isOpen, (open) => {
  if (!open) return
  query.value = ''
  activeIndex.value = 0
  nextTick(() => inputRef.value?.focus())
})
</script>

<template>
  <Teleport to="body">
    <Transition name="search">
      <div v-if="isOpen" class="search-modal" @keydown.esc="close">
        <div class="backdrop" @click="close" />
        <div
          ref="panelRef"
          class="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="t('search.label')"
        >
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
                <template v-if="results.length">
                  <div v-for="group in sections" :key="group.section" class="section">
                    <span class="section-title">{{ t(`search.sections.${group.section}`) }}</span>
                    <ul class="results">
                      <li v-for="item in group.items" :key="item.entry.to">
                        <RouterLink
                          :to="item.entry.to"
                          class="result"
                          :class="{ active: item.index === activeIndex }"
                          @click="close"
                          @mouseenter="activeIndex = item.index"
                          @focus="activeIndex = item.index"
                          @keydown.down.prevent="moveFocus(1)"
                          @keydown.up.prevent="moveFocus(-1)"
                        >
                          <span class="result-label">{{ item.entry.label }}</span>
                          <span v-if="item.entry.sub" class="result-sub">{{ item.entry.sub }}</span>
                        </RouterLink>
                      </li>
                    </ul>
                  </div>
                </template>
                <p v-else class="empty">{{ t('search.empty') }}</p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 192px 16px 16px;

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
    box-shadow: var(--shadow-overlay);
  }

  .field {
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-heading);
    font-size: 16px;

    &::placeholder {
      color: var(--color-text-mute);
    }

    &:focus-visible {
      outline: none;
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

  .section {
    margin-top: 8px;

    .section-title {
      display: block;
      padding: 0 12px;
      color: var(--color-text-mute);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
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
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      border-radius: 20px;
      color: var(--color-text);
      text-decoration: none;

      &.active {
        background: var(--color-background-mute);
      }

      .result-sub {
        color: var(--color-text-mute);
        font-family: var(--font-text);
        font-size: 12px;
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
