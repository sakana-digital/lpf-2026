<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { localized } from '@shared/locale'
import { organizationImageAlt, organizationImageSrc } from '@/lib/organization'
import type { Organization } from '@/data/organizations'
import type { OrgStatus } from '@shared/status'
import OrgImage from './OrgImage.vue'
import OrgStatusBadges from './OrgStatusBadges.vue'

const props = defineProps<{
  org: Organization
  status?: OrgStatus
}>()

const { t, locale } = useI18n()

const imageSrc = computed(() => organizationImageSrc(props.org))
const alt = computed(() => organizationImageAlt(props.org, locale.value, t))
const description = computed(() => localized(props.org.description, locale.value))

// An undeclared allergen list stays undefined here, so it never reads as "none"
const menus = computed(() =>
  (props.org.menus ?? []).map((item, index) => ({
    key: `${props.org.id}-${index}`,
    name: localized(item.name, locale.value),
    price: item.price,
    allergens: item.allergens?.map((allergen) => t(`allergens.${allergen}`)),
  })),
)
</script>

<template>
  <div class="org-detail">
    <OrgImage :src="imageSrc" :alt="alt" />
    <OrgStatusBadges v-if="status" :status="status" />
    <p v-if="description" class="description">{{ description }}</p>
    <div v-if="menus.length" class="menus">
      <span class="menus-title">{{ t('explore.menu.title') }}</span>
      <ul>
        <li v-for="item in menus" :key="item.key">
          <span class="menu-head">
            <span class="menu-name">{{ item.name }}</span>
            <span v-if="item.price != null" class="menu-price">
              {{ t('explore.menu.price', { price: item.price }) }}
            </span>
          </span>
          <span v-if="!item.allergens" class="menu-allergens unknown">
            {{ t('explore.menu.allergensUnknown') }}
          </span>
          <span v-else-if="item.allergens.length === 0" class="menu-allergens">
            {{ t('explore.menu.allergensFree') }}
          </span>
          <span v-else class="menu-allergens">
            {{ t('explore.menu.allergensList', { list: item.allergens.join(' / ') }) }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.org-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;

  .description {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-text);
    font-size: 12px;
    line-height: 1.6;
  }

  .menus {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .menus-title {
      color: var(--color-text-mute);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    ul {
      display: flex;
      flex-direction: column;
      gap: 6px;
      list-style: none;
      padding: 0;
      margin: 0;
    }

    li {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-top: 6px;
      border-top: 1px solid var(--color-border);
    }

    .menu-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;

      .menu-name {
        font-family: var(--font-text);
        font-size: 12px;
      }

      .menu-price {
        color: var(--color-text-mute);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
      }
    }

    .menu-allergens {
      color: var(--color-text-mute);
      font-family: var(--font-text);
      font-size: 11px;
      line-height: 1.5;

      &.unknown {
        font-style: italic;
      }
    }
  }
}
</style>
