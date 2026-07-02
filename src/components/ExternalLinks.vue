<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import InstagramIcon from '../assets/instagram.vue'

const { t } = useI18n()

const instagramUrl = 'https://www.instagram.com/lisa_papillon_festival/' // InstagramのURLをここに設定
// const schoolUrl = 'https://www.pen-kanagawa.ed.jp/kanagawasogosangyo-h/zennichi/index.html' 後でアイコン追加
</script>

<template>
  <div class="external-links">
    <a
      class="link icon-link"
      :href="instagramUrl"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="t('nav.instagram')"
    >
      <InstagramIcon />
    </a>
    <!-- <a class="link" :href="schoolUrl" target="_blank" rel="noopener noreferrer">
      {{ t('externalLinks.school') }}
    </a> -->
  </div>
</template>

<style scoped>
.external-links {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

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
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }
}
</style>
