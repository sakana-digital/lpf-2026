<script setup lang="ts">
import ExternalLinks from './ExternalLinks.vue'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer-content">
      <p class="copyright">© {{ year }} 神奈川総合産業高等学校 全日制 文化祭実行委員会</p>
      <ExternalLinks />
    </div>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  justify-content: center;
  height: var(--footer-height);
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1024px;
}

.copyright {
  margin-left: 16px;
  color: var(--color-text-mute);
  font-size: 12px;
}
</style>
