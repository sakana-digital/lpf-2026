<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { resolveFestivalDay } from '@/config/festival'

const { t } = useI18n()

const day = resolveFestivalDay()
</script>

<template>
  <span v-if="day" class="day-badge">{{
    typeof day === 'number' ? t(`dayBadge.day${day}`) : t(`dayBadge.${day}`)
  }}</span>
</template>

<style scoped>
.day-badge {
  display: flex;
  align-items: center;
  height: 100%;
  font-size: 12px;
}
</style>
