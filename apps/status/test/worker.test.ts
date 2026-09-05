import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { env, SELF } from 'cloudflare:test'

const origin = 'https://happo-sai-status.test.workers.dev'
const siteOrigin = 'https://happo-sai.pages.dev'
const adminHeaders = { Authorization: 'Bearer test-admin' }

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

beforeEach(async () => {
  const [orgHash, adminHash] = await Promise.all([tokenHash('test-org'), tokenHash('test-admin')])
  await env.DB.batch([
    env.DB.prepare('DELETE FROM org_status'),
    env.DB.prepare('DELETE FROM org_tokens'),
    env.DB.prepare('DELETE FROM admin_tokens'),
    env.DB.prepare('DELETE FROM signage_viewer_auth'),
    env.DB.prepare('DELETE FROM hidden_orgs'),
    env.DB.prepare('DELETE FROM submit_windows'),
    env.DB.prepare(
      `UPDATE signage_config
       SET org_ids = '[]', active_video_key = NULL, footer_text = '',
           alert_enabled = 0, alert_text = '', updated_at = unixepoch()
       WHERE id = 1`,
    ),
    env.DB.prepare('INSERT INTO org_tokens (token_hash, org_id) VALUES (?1, ?2)').bind(
      orgHash,
      'c1-1',
    ),
    env.DB.prepare('INSERT INTO admin_tokens (token_hash) VALUES (?1)').bind(adminHash),
  ])
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

  it('stores ordered organizations and returns statuses outside submission windows', async () => {
    const secondOrgHash = await tokenHash('test-org-2')
    await env.DB.batch([
      env.DB.prepare('INSERT INTO org_tokens (token_hash, org_id) VALUES (?1, ?2)').bind(
        secondOrgHash,
        'c1-2',
      ),
      env.DB.prepare(
        `INSERT INTO org_status (org_id, sales, congestion, updated_at)
         VALUES ('c1-2', 'available', 'low', unixepoch())`,
      ),
      env.DB.prepare(
        `INSERT INTO submit_windows (day, accept_from, accept_until) VALUES (1, 1, 2)
         ON CONFLICT (day) DO UPDATE SET accept_from = 1, accept_until = 2`,
      ),
    ])
    const saved = await SELF.fetch(`${origin}/api/signage`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgIds: ['c1-2', 'c1-1'],
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
      config: { orgIds: string[]; videoStartAt: number | null }
      statuses: Array<{ orgId: string }>
    }
    expect(payload.config.orgIds).toEqual(['c1-2', 'c1-1'])
    expect(payload.config.videoStartAt).toBe(1790000000)
    expect(payload.statuses).toEqual([expect.objectContaining({ orgId: 'c1-2' })])
    expect(await (await SELF.fetch(`${siteOrigin}/api/status`)).json()).toEqual([])
  })

  it('validates organization IDs and text limits', async () => {
    const response = await SELF.fetch(`${origin}/api/signage`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgIds: ['missing'],
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

describe('signage videos', () => {
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
    await env.DB.prepare(
      `UPDATE signage_config SET org_ids = '["c1-1"]', active_video_key = ?1 WHERE id = 1`,
    )
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

describe('public organizations', () => {
  it('hides the selected organizations from the public list only', async () => {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO org_tokens (token_hash, org_id) VALUES (?1, ?2)').bind(
        await tokenHash('test-org-2'),
        'c1-2',
      ),
      env.DB.prepare(
        `INSERT INTO org_status (org_id, sales, congestion, updated_at) VALUES
         ('c1-1', 'available', 'low', unixepoch()), ('c1-2', 'available', 'low', unixepoch())`,
      ),
    ])

    const saved = await SELF.fetch(`${origin}/api/orgs`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: ['c1-2'] }),
    })
    expect(saved.status).toBe(200)

    const publicList = (await (await SELF.fetch(`${siteOrigin}/api/status`)).json()) as Array<{
      orgId: string
    }>
    expect(publicList.map((status) => status.orgId)).toEqual(['c1-1'])

    const me = (await (await SELF.fetch(`${origin}/api/me`, { headers: adminHeaders })).json()) as {
      statuses: Array<{ orgId: string }>
      hiddenOrgs: string[]
    }
    expect(me.statuses.map((status) => status.orgId).sort()).toEqual(['c1-1', 'c1-2'])
    expect(me.hiddenOrgs).toEqual(['c1-2'])
  })

  it('rejects unknown organizations and non-admin callers', async () => {
    const unknown = await SELF.fetch(`${origin}/api/orgs`, {
      method: 'PUT',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: ['missing'] }),
    })
    expect(unknown.status).toBe(400)

    const forbidden = await SELF.fetch(`${origin}/api/orgs`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer test-org', 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: [] }),
    })
    expect(forbidden.status).toBe(403)
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
