import { describe, expect, it } from 'vite-plus/test'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { SignageConfig } from '../../../shared/status'
import SignageCanvas from '../src/components/SignageCanvas.vue'

const config: SignageConfig = {
  orgIds: ['c1-1', 'c1-2', 'c1-3', 'c1-4', 'c1-5', 'c1-6', 'c1-7', 'c1-8', 'c2-1'],
  activeVideoKey: null,
  footerText: '固定案内テスト',
  alertEnabled: true,
  alertText: '速報テスト',
  updatedAt: 1,
}

describe('SignageCanvas', () => {
  it('renders eight organizations, statuses, footer, alert and video fallback', async () => {
    const app = createSSRApp({
      render: () =>
        h(SignageCanvas, {
          config,
          statuses: [{ orgId: 'c1-1', sales: 'available', congestion: 'low', updatedAt: 1 }],
          preview: true,
        }),
    })
    const html = await renderToString(app)

    expect(html).toContain('1年1組')
    expect(html).toContain('1年8組')
    expect(html).not.toContain('2年1組')
    expect(html).toContain('販売中')
    expect(html).toContain('未報告')
    expect(html).toContain('固定案内テスト')
    expect(html).toContain('速報テスト')
    expect(html).toContain('映像準備中')
  })
})
