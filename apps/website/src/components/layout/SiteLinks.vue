<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import IconInstagram from '@/components/icons/IconInstagram.vue'
import IconHome from '@/components/icons/IconHome.vue'
import IconCopy from '@/components/icons/IconCopy.vue'
import IconCheck from '@/components/icons/IconCheck.vue'
import { useCopyLink } from '@/composables/useCopyLink'
import { instagramUrl, schoolUrl } from '@/config/social'

const { t } = useI18n()
const route = useRoute()
const { copied, copyLink } = useCopyLink()

function copyCurrentLink() {
  copyLink(window.location.origin + route.fullPath)
}
</script>

<template>
  <div class="site-links">
    <div class="icons">
      <button
        type="button"
        class="icon-link copy-button"
        :aria-label="copied ? t('copyLink.copied') : t('copyLink.copy')"
        @click="copyCurrentLink"
      >
        <IconCheck v-if="copied" />
        <IconCopy v-else />
      </button>
      <a
        class="icon-link"
        :href="schoolUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('siteLinks.school')"
      >
        <IconHome />
      </a>
      <a
        class="icon-link"
        :href="instagramUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('nav.instagram')"
      >
        <IconInstagram />
      </a>
    </div>
  </div>
</template>

<style scoped>
.site-links {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .icons {
    display: flex;
    align-items: center;
  }

  .icon-link {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--color-text-mute);
    cursor: pointer;
  }
}
</style>
