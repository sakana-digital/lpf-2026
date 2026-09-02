<script setup lang="ts">
import { RouterView } from 'vue-router'
import Header from '@/components/layout/Header.vue'
import SearchModal from '@/components/search/SearchModal.vue'
import PaymentNotice from '@/components/layout/PaymentNotice.vue'
import { useCanonicalLinks } from '@/composables/useCanonicalLinks'

useCanonicalLinks()
</script>

<template>
  <Header />
  <RouterView />
  <SearchModal />
  <PaymentNotice />
</template>
