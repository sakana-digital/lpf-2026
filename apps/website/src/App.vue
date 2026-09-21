<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import Header from '@/components/layout/Header.vue'
import Footer from '@/components/layout/Footer.vue'
import SearchModal from '@/components/search/SearchModal.vue'
import { useCanonicalLinks } from '@/composables/useCanonicalLinks'
import { isRootPath } from '@/data/pages'

useCanonicalLinks()

const route = useRoute()
const isHome = computed(() => isRootPath(route.path))
</script>

<template>
  <Header />
  <RouterView />
  <Footer v-if="isHome" />
  <SearchModal />
</template>
