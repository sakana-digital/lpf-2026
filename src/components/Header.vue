<script setup lang="ts">
import Logo from '../assets/logo.vue'
import Breadcrumb from './Breadcrumb.vue'
import DayBadge from './DayBadge.vue'
import ThemeToggle from './ThemeToggle.vue'
</script>

<template>
  <header class="header">
    <nav class="global-nav">
      <div class="header-breadcrumb">
        <RouterLink to="/" class="logo"><Logo /></RouterLink>
        <Breadcrumb />
      </div>
      <div class="header-actions">
        <DayBadge />
        <ThemeToggle />
      </div>
    </nav>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: center;
  grid-area: header;
  height: 48px;
}

.global-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1024px;
  margin: 0 16px;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  position: relative;
  display: flex;
  height: 32px;
}
</style>
