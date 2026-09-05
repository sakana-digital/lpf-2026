import { defineConfig } from 'vitepress'

const repository = 'https://github.com/sakana-digital/lpf-2026'

export default defineConfig({
  title: '八宝祭 ドキュメント',
  description: '八宝祭 2026 のステータスアプリの使い方',
  base: '/lpf-2026/',
  cleanUrls: true,
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: '/lpf-2026/favicon.svg' }]],
  vite: {
    server: { host: true },
  },
  locales: {
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      link: '/ja/',
      themeConfig: {
        siteTitle: 'ドキュメント',
        sidebar: [
          {
            items: [
              { text: 'はじめに', link: '/ja/' },
              { text: '各団体がやること', link: '/ja/status-org' },
              { text: '管理者がやること', link: '/ja/status-admin' },
              { text: '実行委員がやること', link: '/ja/status-signage' },
            ],
          },
        ],
        outline: { level: [2, 3], label: '目次' },
        docFooter: { prev: '前のページ', next: '次のページ' },
        darkModeSwitchLabel: 'テーマ',
        returnToTopLabel: 'トップへ',
        sidebarMenuLabel: 'メニュー',
        langMenuLabel: '言語を切り替える',
        lastUpdated: { text: '最終更新' },
        editLink: {
          pattern: `${repository}/edit/main/docs/:path`,
          text: 'このページを編集',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'Happo-sai Docs',
      description: 'How to use the Happo-sai 2026 status app',
      themeConfig: {
        siteTitle: 'Docs',
        sidebar: [{ text: 'Happo-sai Docs', items: [{ text: 'Overview', link: '/en/' }] }],
        editLink: {
          pattern: `${repository}/edit/main/docs/:path`,
          text: 'Edit this page',
        },
      },
    },
  },
  themeConfig: {
    socialLinks: [{ icon: 'github', link: repository }],
    search: {
      provider: 'local',
      options: {
        locales: {
          ja: {
            translations: {
              button: { buttonText: '検索', buttonAriaLabel: '検索' },
              modal: {
                displayDetails: '詳細を表示',
                resetButtonTitle: '検索をリセット',
                backButtonTitle: '戻る',
                noResultsText: '見つかりませんでした',
                footer: {
                  selectText: '選択',
                  navigateText: '移動',
                  closeText: '閉じる',
                },
              },
            },
          },
        },
      },
    },
  },
})
