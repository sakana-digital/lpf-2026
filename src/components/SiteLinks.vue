<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import InstagramIcon from './icons/instagram.vue'
import CopyIcon from './icons/copy.vue'
import CheckIcon from './icons/check.vue'
import { useCopyLink } from '../composables/useCopyLink'

const { t } = useI18n()
const route = useRoute()
const { copied, copyLink } = useCopyLink()

const instagramUrl = 'https://www.instagram.com/lisa_papillon_festival/' // InstagramのURLをここに設定
// const schoolUrl = 'https://www.pen-kanagawa.ed.jp/kanagawasogosangyo-h/zennichi/index.html' 後でアイコン追加

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
        <CheckIcon v-if="copied" />
        <CopyIcon v-else />
      </button>
      <a
        class="icon-link"
        :href="instagramUrl"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('nav.instagram')"
      >
        <InstagramIcon />
      </a>
    </div>
    <!-- <a class="link" :href="schoolUrl" target="_blank" rel="noopener noreferrer">
      {{ t('siteLinks.school') }}
    </a> -->
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

  .link {
    color: var(--color-text-mute);
    font-size: 14px;
    text-decoration: none;

    &:hover {
      color: var(--color-heading);
    }
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
    color: inherit;
    cursor: pointer;

    &:hover {
      color: var(--color-heading);
    }
  }
}
</style>
