<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const jstDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date())

const day =
  jstDate === '2026-09-26'
    ? 1
    : jstDate === '2026-09-27'
      ? 2
      : jstDate > '2026-09-27'
        ? 'ended'
        : null
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
