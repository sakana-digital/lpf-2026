<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <p class="copyright">© {{ year }} 神奈川総合産業高等学校 全日制 文化祭実行委員会</p>
  </footer>
</template>

<style scoped>
.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  height: var(--footer-height);
}

.copyright {
  color: var(--color-text-mute);
  font-size: 12px;
}
</style>
