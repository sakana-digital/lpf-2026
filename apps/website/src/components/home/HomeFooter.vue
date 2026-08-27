<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import IconLogo from '@/components/icons/IconLogo.vue'
import { localePath } from '@/config/pages'

const { t, locale } = useI18n()

const homePath = computed(() => localePath('/', locale.value))
</script>

<template>
  <footer class="home-footer">
    <RouterLink :to="homePath" class="brand" :aria-label="t('home.footer.home')">
      <IconLogo />
    </RouterLink>
    <p class="copyright">{{ t('home.footer.copyright') }}</p>
  </footer>
</template>

<style scoped>
.home-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 160px 0;

  .brand {
    display: inline-flex;
    color: var(--color-heading);
  }

  .copyright {
    color: var(--color-text-mute);
    font-size: 13px;
  }
}
</style>
