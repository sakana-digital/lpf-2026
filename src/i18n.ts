import { createI18n } from 'vue-i18n'
import ja from './locales/ja.json'
import en from './locales/en.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'ja',
  messages: { ja, en },
})
