import { describe, expect, it } from 'vite-plus/test'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { SignageConfig } from '@shared/status'
import SignageCanvas from '../src/components/SignageCanvas.vue'

const orgIds = ['c1-1', 'c1-2', 'c1-3', 'c1-4', 'c1-5', 'c1-6', 'c1-7', 'c1-8', 'c1-9']

function makeConfig(alertEnabled = false): SignageConfig {
  return {
    activeVideoKey: null,
    videoStartAt: null,
    activeAudioKey: null,
    audioStartAt: null,
    footerText: '固定案内テスト',
    alertEnabled,
    alertText: '速報テスト',
    updatedAt: 1,
  }
}

function render(config: SignageConfig, props: Record<string, unknown> = {}) {
  return renderToString(
    createSSRApp({
      render: () =>
        h(SignageCanvas, {
          config,
          orgIds,
          statuses: [{ orgId: 'c1-1', sales: 'available', congestion: 'low', updatedAt: 1 }],
          ...props,
        }),
    }),
  )
}

function onSignage(videoStartAt: number | null) {
  return render(
    { ...makeConfig(), activeVideoKey: 'signage/videos/a.mp4', videoStartAt },
    { videoUrl: '/api/signage/video/a.mp4' },
  )
}

const nowSec = Math.floor(Date.now() / 1000)

describe('SignageCanvas', () => {
  it('renders organizations, statuses, footer and video fallback', async () => {
    const html = await render(makeConfig())

    expect(html).toContain('1年次1組')
    expect(html).toContain('1年次9組')
    expect(html).toContain('販売中')
    expect(html).toContain('未報告')
    expect(html).toContain('INFORMATION')
    expect(html).toContain('固定案内テスト')
    expect(html).toContain('映像準備中')
  })

  it('lets an alert take the ticker over, keeping the heading', async () => {
    const html = await render(makeConfig(true))

    expect(html).toContain('INFORMATION')
    expect(html).toContain('速報テスト')
    expect(html).not.toContain('固定案内テスト')
  })

  it('waits for the scheduled start before playing the video', async () => {
    expect(await onSignage(nowSec + 3600)).toContain('映像準備中')
    expect(await onSignage(nowSec + 3600)).not.toContain('<video')
  })

  it('plays muted once the start time has passed, offering to enable sound', async () => {
    const html = await onSignage(nowSec - 3600)

    expect(html).toContain('<video')
    expect(html).toContain('muted')
    expect(html).toContain('音声を有効にする')
    expect(html).not.toContain('映像準備中')
  })

  it('waits for the scheduled start before playing the audio', async () => {
    const audio = { activeAudioKey: 'signage/audios/a.mp3', audioStartAt: nowSec + 3600 }
    const props = { audioUrl: '/api/signage/audio/a.mp3' }
    const pending = await render({ ...makeConfig(), ...audio }, props)

    expect(pending).not.toContain('<audio')
    // The tap has to happen before the audio is due, so the offer comes early.
    expect(pending).toContain('音声を有効にする')

    const playing = await render({ ...makeConfig(), ...audio, audioStartAt: nowSec - 1 }, props)
    expect(playing).toContain('<audio')
  })

  it('stays silent without a start time', async () => {
    const html = await render(
      { ...makeConfig(), activeAudioKey: 'signage/audios/a.mp3', audioStartAt: null },
      { audioUrl: '/api/signage/audio/a.mp3' },
    )

    expect(html).not.toContain('<audio')
    expect(html).not.toContain('音声を有効にする')
  })

  it('keeps a page between eight and twelve rows', async () => {
    expect(await render(makeConfig(), { orgIds: orgIds.slice(0, 5) })).toContain('--rows:8')
    expect(await render(makeConfig())).toContain('--rows:9')
  })
})
