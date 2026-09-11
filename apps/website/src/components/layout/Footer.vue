<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconLogo from '@/components/icons/IconLogo.vue'
import LanguageToggle from './LanguageToggle.vue'
import { localePath } from '@/data/pages'

const { t, locale } = useI18n()
const homePath = computed(() => localePath('/', locale.value))
</script>

<template>
  <footer class="footer">
    <div class="inner">
      <RouterLink :to="homePath" class="brand" :aria-label="t('footer.home')">
        <IconLogo />
      </RouterLink>
      <p class="copyright">{{ t('footer.copyright') }}</p>
      <LanguageToggle />
    </div>
  </footer>
</template>

<style scoped>
.footer {
  @media (max-height: 500px) {
    html[data-orientation='landscape-left'] & {
      padding-left: var(--header-height);
    }

    html[data-orientation='landscape-right'] & {
      padding-right: var(--header-height);
    }
  }

  .inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    max-width: 1024px;
    margin-inline: auto;
    padding: 160px 16px;

    @media (max-width: 600px) {
      gap: 16px;
      padding: 96px 16px 64px;
    }
  }

  .brand {
    display: inline-flex;
    color: var(--color-heading);
  }

  .copyright {
    color: var(--color-text-mute);
    font-size: 13px;

    @media (max-width: 600px) {
      order: 1;
      flex-basis: 100%;
      text-align: center;
    }
  }
}
</style>
