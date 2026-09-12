import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { env, SELF } from 'cloudflare:test'
import { STATUS_ORG_IDS } from '../../../shared/status'
import { festivalDates, festivalHours } from '../../../shared/timetable'

const origin = 'https://happo-sai-status.test.workers.dev'
const siteOrigin = 'https://happo-sai.pages.dev'
const adminHeaders = { Authorization: 'Bearer test-admin' }

function jstDate(sec: number): string {
  return new Date(sec * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

function jstClock(sec: number): string {
  return new Date(sec * 1000).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function issueViewerCookie(): Promise<string> {
  const issued = await SELF.fetch(`${origin}/api/signage/viewer-token`, {
    method: 'POST',
    headers: adminHeaders,
  })
  const { url } = (await issued.json()) as { url: string }
  const bootstrap = await SELF.fetch(url, { redirect: 'manual' })
  return bootstrap.headers.get('Set-Cookie')!.split(';')[0]!
}

// Stalls may only send while the festival is open, so every test sits inside Day 1.
const FESTIVAL_NOON = new Date('2026-09-26T12:00:00+09:00')

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FESTIVAL_NOON)
  const [orgHash, adminHash] = await Promise.all([tokenHash('test-org'), tokenHash('test-admin')])
  await env.DB.batch([
    env.DB.prepare('DELETE FROM org_status'),
    env.DB.prepare('DELETE FROM org_status_log'),
    env.DB.prepare('DELETE FROM org_tokens'),
    env.DB.prepare('DELETE FROM admin_tokens'),
    env.DB.prepare('DELETE FROM signage_viewer_auth'),
    env.DB.prepare('DELETE FROM submit_windows'),
    env.DB.prepare('DELETE FROM test_session'),
    env.DB.prepare(
      `UPDATE signage_config
       SET active_video_key = NULL, video_start_at = NULL,
           active_audio_key = NULL, audio_start_at = NULL, footer_text = '',
           alert_enabled = 0, alert_text = '', updated_at = unixepoch()
       WHERE id = 1`,
    ),
    env.DB.prepare('INSERT INTO org_tokens (token_hash, org_id) VALUES (?1, ?2)').bind(
      orgHash,
      'c2-3',
    ),
    env.DB.prepare('INSERT INTO admin_tokens (token_hash) VALUES (?1)').bind(adminHash),
  ])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('signage authentication and configuration', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await SELF.fetch(`${origin}/api/signage`)
    expect(response.status).toBe(401)
  })

  it('stores only token hashes in D1', async () => {
    const columns = await env.DB.prepare('PRAGMA table_info(admin_tokens)').all<{ name: string }>()
    const row = await env.DB.prepare('SELECT token_hash FROM admin_tokens').first<{
      token_hash: string
    }>()

    expect(columns.results.map((column) => column.name)).toEqual(['token_hash'])
    expect(row?.token_hash).toBe(await tokenHash('test-admin'))
    expect(row?.token_hash).not.toContain('test-admin')
  })

  it('issues a cookie and invalidates it when the viewer URL is reissued', async () => {
    const oldCookie = await issueViewerCookie()
    expect(
      (await SELF.fetch(`${origin}/api/signage`, { headers: { Cookie: oldCookie } })).status,
    ).toBe(200)

    const newCookie = await issueViewerCookie()
    expect(
      (await SELF.fetch(`${origin}/api/signage`, { headers: { Cookie: oldCookie } })).status,
    ).toBe(401)
    expect(
      (await SELF.fetch(`${origin}/api/signage`, { headers: { Cookie: newCookie } })).status,
    ).toBe(200)
  })

  it('lists the status organizations and keeps statuses while the public list is closed', async () => {
    vi.setSystemTime(new Date('2026-09-26T17:00:00+09:00'))
    await env.DB.prepare(
      `INSERT INTO org_status (org_id, sales, congestion, updated_at)
       VALUES ('c2-5', 'available', 'low', unixepoch())`,
    ).run()
    const saved = await SELF.fetch(`${origin}/api/signage`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeVideoKey: null,
        videoStartAt: 1790000000,
        footerText: '文化祭開催中',
        alertEnabled: true,
        alertText: '速報テスト',
      }),
    })
    expect(saved.status).toBe(200)

    const cookie = await issueViewerCookie()
    const response = await SELF.fetch(`${origin}/api/signage`, { headers: { Cookie: cookie } })
    const payload = (await response.json()) as {
      config: { videoStartAt: number | null }
      statuses: Array<{ orgId: string }>
    }
    expect(payload.config.videoStartAt).toBe(1790000000)
    expect(payload.statuses).toEqual([expect.objectContaining({ orgId: 'c2-5' })])
    expect(await (await SELF.fetch(`${siteOrigin}/api/status`)).json()).toEqual([])
  })

  it('validates times and text limits', async () => {
    const response = await SELF.fetch(`${origin}/api/signage`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeVideoKey: null,
        videoStartAt: 'noon',
        footerText: 'x'.repeat(121),
        alertEnabled: false,
        alertText: '',
      }),
    })
    expect(response.status).toBe(400)
  })
})

describe('signage media', () => {
  it('validates MP4 metadata and starts/aborts multipart uploads', async () => {
    const invalid = await SELF.fetch(`${origin}/api/signage/uploads`, {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'movie.mov', size: 100, type: 'video/quicktime' }),
    })
    expect(invalid.status).toBe(400)

    const started = await SELF.fetch(`${origin}/api/signage/uploads`, {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'movie.mp4', size: 6 * 1024 * 1024, type: 'video/mp4' }),
    })
    expect(started.status).toBe(201)
    const upload = (await started.json()) as { key: string; uploadId: string; partSize: number }
    expect(upload.key).toMatch(/^signage\/videos\/.+\.mp4$/)
    expect(upload.partSize).toBe(16 * 1024 * 1024)

    const aborted = await SELF.fetch(
      `${origin}/api/signage/uploads/${encodeURIComponent(upload.uploadId)}?key=${encodeURIComponent(upload.key)}`,
      { method: 'DELETE', headers: adminHeaders },
    )
    expect(aborted.status).toBe(204)
  })

  it('streams the active video with byte ranges and protects deletion', async () => {
    const key = 'signage/videos/test.mp4'
    await env.SIGNAGE_MEDIA.put(key, new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), {
      httpMetadata: { contentType: 'video/mp4' },
      customMetadata: { originalName: 'test.mp4' },
    })
    await env.DB.prepare(`UPDATE signage_config SET active_video_key = ?1 WHERE id = 1`)
      .bind(key)
      .run()
    const cookie = await issueViewerCookie()
    const response = await SELF.fetch(`${origin}/api/signage/video/${encodeURIComponent(key)}`, {
      headers: { Cookie: cookie, Range: 'bytes=2-5' },
    })
    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 2-5/8')
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([2, 3, 4, 5])

    const notModified = await SELF.fetch(`${origin}/api/signage/video/${encodeURIComponent(key)}`, {
      headers: { Cookie: cookie, 'If-None-Match': response.headers.get('ETag')! },
    })
    expect(notModified.status).toBe(304)

    const deletion = await SELF.fetch(`${origin}/api/signage/videos/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: adminHeaders,
    })
    expect(deletion.status).toBe(409)
  })

  it('files an audio upload under its own prefix', async () => {
    const started = await SELF.fetch(`${origin}/api/signage/uploads`, {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'closing.mp3', size: 3 * 1024 * 1024, type: 'audio/mpeg' }),
    })
    expect(started.status).toBe(201)
    expect(((await started.json()) as { key: string }).key).toMatch(/^signage\/audios\/.+\.mp3$/)

    const unsupported = await SELF.fetch(`${origin}/api/signage/uploads`, {
      method: 'POST',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'closing.wav', size: 1024, type: 'audio/wav' }),
    })
    expect(unsupported.status).toBe(400)
  })

  it('keeps audio on its own endpoints and plays it at the saved time', async () => {
    const key = 'signage/audios/test.mp3'
    await env.SIGNAGE_MEDIA.put(key, new Uint8Array([0, 1, 2]), {
      httpMetadata: { contentType: 'audio/mpeg' },
      customMetadata: { originalName: 'closing.mp3' },
    })
    const saved = await SELF.fetch(`${origin}/api/signage`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activeVideoKey: null,
        videoStartAt: null,
        activeAudioKey: key,
        audioStartAt: 1790000000,
        footerText: '',
        alertEnabled: false,
        alertText: '',
      }),
    })
    expect(saved.status).toBe(200)
    expect(await saved.json()).toEqual(
      expect.objectContaining({ activeAudioKey: key, audioStartAt: 1790000000 }),
    )

    const listed = await SELF.fetch(`${origin}/api/signage/audios`, { headers: adminHeaders })
    expect(await listed.json()).toEqual([expect.objectContaining({ key, name: 'closing.mp3' })])
    const videos = (await (
      await SELF.fetch(`${origin}/api/signage/videos`, { headers: adminHeaders })
    ).json()) as Array<{ key: string }>
    expect(videos.map((video) => video.key)).not.toContain(key)

    const cookie = await issueViewerCookie()
    const played = await SELF.fetch(`${origin}/api/signage/audio/${encodeURIComponent(key)}`, {
      headers: { Cookie: cookie },
    })
    expect(played.ok).toBe(true)
    expect([...new Uint8Array(await played.arrayBuffer())]).toEqual([0, 1, 2])
    const mismatched = await SELF.fetch(`${origin}/api/signage/video/${encodeURIComponent(key)}`, {
      headers: { Cookie: cookie },
    })
    expect(mismatched.status).toBe(404)

    const deletion = await SELF.fetch(`${origin}/api/signage/audios/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: adminHeaders,
    })
    expect(deletion.status).toBe(409)
  })
})

describe('public status endpoint', () => {
  it('is briefly cacheable while authenticated responses are not', async () => {
    const status = await SELF.fetch(`${siteOrigin}/api/status`)
    expect(status.headers.get('Cache-Control')).toBe('public, max-age=15')

    const me = await SELF.fetch(`${origin}/api/me`, {
      headers: { Authorization: 'Bearer test-org' },
    })
    expect(me.status).toBe(200)
    expect(me.headers.get('Cache-Control')).toBe('no-store')
  })
})

describe('status organizations', () => {
  it('accepts the food stalls only, whatever tokens exist', async () => {
    await env.DB.prepare('INSERT INTO org_tokens (token_hash, org_id) VALUES (?1, ?2)')
      .bind(await tokenHash('test-org-2'), 'c1-1')
      .run()
    const post = (token: string, body: Record<string, unknown>) =>
      SELF.fetch(`${origin}/api/status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

    const refused = await post('test-org-2', { sales: 'available', congestion: 'low' })
    expect(refused.status).toBe(403)
    expect(await refused.json()).toEqual({ error: 'not_accepted' })

    const me = (await (
      await SELF.fetch(`${origin}/api/me`, { headers: { Authorization: 'Bearer test-org-2' } })
    ).json()) as { accepted: boolean }
    expect(me.accepted).toBe(false)

    expect((await post('test-org', { sales: 'available', congestion: 'low' })).status).toBe(200)
    expect(
      (await post('test-admin', { sales: 'soldout', congestion: null, orgId: 'c2-5' })).status,
    ).toBe(200)
    const unknown = await post('test-admin', { sales: 'soldout', congestion: null, orgId: 'c1-1' })
    expect(unknown.status).toBe(400)

    const admin = (await (
      await SELF.fetch(`${origin}/api/me`, { headers: adminHeaders })
    ).json()) as {
      statuses: Array<{ orgId: string }>
    }
    expect(admin.statuses.map((status) => status.orgId).sort()).toEqual(['c2-3', 'c2-5'])
  })
})

describe('status history', () => {
  it('keeps every update while org_status holds only the latest', async () => {
    const post = (sales: string, congestion: string | null, token: string, orgId?: string) =>
      SELF.fetch(`${origin}/api/status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(orgId ? { sales, congestion, orgId } : { sales, congestion }),
      })

    expect((await post('available', 'low', 'test-org')).status).toBe(200)
    expect((await post('low', 'high', 'test-org')).status).toBe(200)
    expect((await post('soldout', null, 'test-admin', 'c2-3')).status).toBe(200)

    const history = (await (
      await SELF.fetch(`${origin}/api/history?orgId=c2-3`, { headers: adminHeaders })
    ).json()) as Array<{ orgId: string; sales: string; congestion: string | null; source: string }>

    expect(history.map((entry) => [entry.sales, entry.congestion, entry.source])).toEqual([
      ['soldout', null, 'admin'],
      ['low', 'high', 'org'],
      ['available', 'low', 'org'],
    ])
    expect(history.every((entry) => entry.orgId === 'c2-3')).toBe(true)

    const current = (await (
      await SELF.fetch(`${origin}/api/me`, { headers: adminHeaders })
    ).json()) as { statuses: Array<{ sales: string }> }
    expect(current.statuses).toEqual([
      expect.objectContaining({ orgId: 'c2-3', sales: 'soldout', congestion: null }),
    ])
  })

  it('records nothing for a rejected update', async () => {
    const rejected = await SELF.fetch(`${origin}/api/status`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-org', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: 'available', congestion: 'nope' }),
    })
    expect(rejected.status).toBe(400)

    const history = await SELF.fetch(`${origin}/api/history`, { headers: adminHeaders })
    expect(await history.json()).toEqual([])
  })

  it('is admin only', async () => {
    expect((await SELF.fetch(`${origin}/api/history`)).status).toBe(401)
    expect(
      (
        await SELF.fetch(`${origin}/api/history`, {
          headers: { Authorization: 'Bearer test-org' },
        })
      ).status,
    ).toBe(403)
  })
})

describe('public list domain', () => {
  it('answers on the site domain only, while writes stay on the Worker domain', async () => {
    expect((await SELF.fetch(`${origin}/api/status`)).status).toBe(404)
    expect((await SELF.fetch(`${siteOrigin}/api/status`)).status).toBe(200)

    const posted = await SELF.fetch(`${origin}/api/status`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-org', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: 'available', congestion: 'low' }),
    })
    expect(posted.status).toBe(200)
    expect((await SELF.fetch(`${origin}/api/me`, { headers: adminHeaders })).status).toBe(200)
  })
})

describe('submit windows', () => {
  it('defaults to the opening hours and follows what the admin saves', async () => {
    const me = async () =>
      (await (await SELF.fetch(`${origin}/api/me`, { headers: adminHeaders })).json()) as {
        windows: { day1: { from: number; until: number } }
      }
    const post = () =>
      SELF.fetch(`${origin}/api/status`, {
        method: 'POST',
        headers: { Authorization: 'Bearer test-org', 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales: 'available', congestion: 'low' }),
      })

    const defaults = (await me()).windows
    expect(jstDate(defaults.day1.from)).toBe(festivalDates[0])
    expect(jstClock(defaults.day1.from)).toBe(festivalHours.open)
    expect(jstClock(defaults.day1.until)).toBe(festivalHours.close)

    vi.setSystemTime(new Date('2026-09-26T17:00:00+09:00'))
    expect((await post()).status).toBe(403)

    const saved = await SELF.fetch(`${origin}/api/window`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day1: { from: defaults.day1.from, until: defaults.day1.until + 2 * 3600 },
        day2: { from: 1, until: 2 },
      }),
    })
    expect(saved.status).toBe(200)
    expect((await me()).windows.day1.until).toBe(defaults.day1.until + 2 * 3600)
    expect((await post()).status).toBe(200)

    const invalid = await SELF.fetch(`${origin}/api/window`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ day1: { from: 5, until: 5 }, day2: { from: 1, until: 2 } }),
    })
    expect(invalid.status).toBe(400)
  })
})

describe('test session', () => {
  const post = (token: string, body: Record<string, unknown>) =>
    SELF.fetch(`${origin}/api/status`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  const me = async (token: string) =>
    (await (
      await SELF.fetch(`${origin}/api/me`, { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { testSince: number | null; status: { sales: string; updatedAt: number } | null }
  const history = async () =>
    (await (
      await SELF.fetch(`${origin}/api/history?orgId=c2-3`, { headers: adminHeaders })
    ).json()) as { sales: string }[]

  it('opens submissions outside the hours while it runs', async () => {
    vi.setSystemTime(new Date('2026-09-25T12:00:00+09:00'))
    const closed = await post('test-org', { sales: 'available', congestion: 'low' })
    expect(closed.status).toBe(403)
    expect(await closed.json()).toEqual({ error: 'closed' })
    expect(
      ((await SELF.fetch(`${siteOrigin}/api/status`).then((r) => r.json())) as []).length,
    ).toBe(0)

    const started = await SELF.fetch(`${origin}/api/test`, {
      method: 'POST',
      headers: adminHeaders,
    })
    const { testSince } = (await started.json()) as { testSince: number }
    expect(typeof testSince).toBe('number')
    expect((await me('test-org')).testSince).toBe(testSince)

    expect((await post('test-org', { sales: 'available', congestion: 'low' })).status).toBe(200)
    expect(
      ((await SELF.fetch(`${siteOrigin}/api/status`).then((r) => r.json())) as []).length,
    ).toBe(1)

    await SELF.fetch(`${origin}/api/test`, { method: 'DELETE', headers: adminHeaders })
    expect((await me('test-org')).testSince).toBeNull()
    expect((await post('test-org', { sales: 'available', congestion: 'low' })).status).toBe(403)
  })

  it('is admin only', async () => {
    for (const method of ['POST', 'DELETE']) {
      const response = await SELF.fetch(`${origin}/api/test`, {
        method,
        headers: { Authorization: 'Bearer test-org' },
      })
      expect(response.status).toBe(403)
    }
  })

  it('keeps the rehearsal apart from the real data and empties it on stop', async () => {
    const before = Math.floor(Date.now() / 1000) - 600
    await env.DB.batch([
      env.DB.prepare('INSERT INTO org_tokens (token_hash, org_id) VALUES (?1, ?2)').bind(
        await tokenHash('test-org-2'),
        'c2-5',
      ),
      env.DB.prepare(
        'INSERT INTO org_status (org_id, sales, congestion, updated_at) VALUES (?1, ?2, ?3, ?4)',
      ).bind('c2-3', 'partial', 'medium', before),
      env.DB.prepare(
        `INSERT INTO org_status_log (org_id, sales, congestion, source, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      ).bind('c2-3', 'partial', 'medium', 'org', before),
    ])

    await SELF.fetch(`${origin}/api/test`, { method: 'POST', headers: adminHeaders })
    // Inside the rehearsal nothing real shows: the group starts from a blank slate.
    expect((await me('test-org')).status).toBeNull()
    expect(await history()).toEqual([])

    expect((await post('test-org', { sales: 'soldout', congestion: null })).status).toBe(200)
    expect((await post('test-org-2', { sales: 'available', congestion: 'low' })).status).toBe(200)
    expect((await history()).map((entry) => entry.sales)).toEqual(['soldout'])
    expect((await me('test-org')).status).toMatchObject({ sales: 'soldout' })
    expect(
      ((await SELF.fetch(`${siteOrigin}/api/status`).then((r) => r.json())) as []).length,
    ).toBe(2)

    const real = await env.DB.prepare(
      'SELECT count(*) AS n FROM org_status_log WHERE test = 0',
    ).first<{ n: number }>()
    expect(real?.n).toBe(1)

    const stopped = await SELF.fetch(`${origin}/api/test`, {
      method: 'DELETE',
      headers: adminHeaders,
    })
    expect(await stopped.json()).toEqual({ testSince: null })

    expect((await history()).map((entry) => entry.sales)).toEqual(['partial'])
    expect((await me('test-org')).status).toMatchObject({ sales: 'partial', updatedAt: before })
    expect((await me('test-org-2')).status).toBeNull()
    for (const table of ['org_status', 'org_status_log']) {
      const left = await env.DB.prepare(`SELECT count(*) AS n FROM ${table} WHERE test = 1`).first<{
        n: number
      }>()
      expect(left?.n).toBe(0)
    }
  })
})
