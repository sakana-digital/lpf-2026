<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Logo from '@/components/common/icons/logo.vue'

const { t, locale } = useI18n()

const homePath = computed(() => (locale.value === 'en' ? '/en' : '/'))
</script>

<template>
  <footer class="home-footer">
    <RouterLink :to="homePath" class="brand" :aria-label="t('home.footer.home')">
      <Logo />
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
  padding-top: 32px;
  padding-bottom: 120px;

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
