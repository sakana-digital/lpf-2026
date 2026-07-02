<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { pages } from '../config/pages'

const { t, locale } = useI18n()

const nodes = computed(() =>
  pages.map((page) => ({
    ...page,
    to: locale.value === 'en' ? (page.path === '/' ? '/en' : `/en${page.path}`) : page.path,
  })),
)

const root = computed(() => nodes.value[0])
const branches = computed(() => nodes.value.slice(1))
</script>

<template>
  <nav class="page-tree" :aria-label="t('sitemap.caption')">
    <div class="head">
      <span class="caption">{{ t('sitemap.caption') }}</span>
      <RouterLink v-if="root" class="node root" :to="root.to">{{ t(root.labelKey) }}</RouterLink>
    </div>
    <div
      v-for="(node, index) in branches"
      :key="node.path"
      class="branch"
      :class="{ first: index === 0, last: index === branches.length - 1 }"
    >
      <RouterLink class="node" :to="node.to">{{ t(node.labelKey) }}</RouterLink>
      <span class="line" aria-hidden="true" />
    </div>
  </nav>
</template>

<style scoped>
.page-tree {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 18px;
  line-height: 1.6;

  .head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 10px;
  }

  .caption {
    color: var(--color-text-mute);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
  }

  .node {
    color: var(--color-text-mute);
    text-decoration: none;

    &:hover,
    &.router-link-active {
      color: var(--color-heading);
    }
  }

  .root {
    display: inline-block;
    width: 48px;
    color: var(--color-heading);
    font-size: 14px;
    text-align: center;
  }

  .branch {
    display: flex;
    align-items: stretch;
    justify-content: flex-end;

    .line {
      position: relative;
      width: 48px;

      &::before {
        content: '';
        position: absolute;
        right: 50%;
        top: 50%;
        width: 50%;
        border-top: 1px solid var(--color-border-hover);
      }

      &::after {
        content: '';
        position: absolute;
        right: 50%;
        top: 0;
        bottom: 0;
        border-right: 1px solid var(--color-border-hover);
      }
    }

    &.first .line::after {
      top: -10px;
    }

    &.last .line::after {
      bottom: 50%;
    }
  }
}
</style>
