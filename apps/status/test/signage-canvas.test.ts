import { describe, expect, it } from 'vite-plus/test'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { SignageConfig } from '@shared/status'
import SignageCanvas from '../src/components/SignageCanvas.vue'

const orgIds = ['c1-1', 'c1-2', 'c1-3', 'c1-4', 'c1-5', 'c1-6', 'c1-7', 'c1-8', 'c1-9']

function makeConfig(count: number): SignageConfig {
  return {
    orgIds: orgIds.slice(0, count),
    activeVideoKey: null,
    footerText: '固定案内テスト',
    alertEnabled: true,
    alertText: '速報テスト',
    updatedAt: 1,
  }
}

function render(config: SignageConfig) {
  return renderToString(
    createSSRApp({
      render: () =>
        h(SignageCanvas, {
          config,
          statuses: [{ orgId: 'c1-1', sales: 'available', congestion: 'low', updatedAt: 1 }],
          preview: true,
        }),
    }),
  )
}

describe('SignageCanvas', () => {
  it('renders organizations, statuses, footer, alert and video fallback', async () => {
    const html = await render(makeConfig(9))

    expect(html).toContain('1年1組')
    expect(html).toContain('1年9組')
    expect(html).toContain('販売中')
    expect(html).toContain('未報告')
    expect(html).toContain('固定案内テスト')
    expect(html).toContain('速報テスト')
    expect(html).toContain('映像準備中')
  })

  it('keeps a page between eight and twelve rows', async () => {
    expect(await render(makeConfig(5))).toContain('--rows:8')
    expect(await render(makeConfig(9))).toContain('--rows:9')
  })
})
