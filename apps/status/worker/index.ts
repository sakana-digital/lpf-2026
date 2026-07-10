/// <reference types="@cloudflare/workers-types" />
import { hidesCongestion, isCongestionLevel, isSalesStatus } from '../../../shared/status'
import type { CongestionLevel, OrgStatus, SalesStatus } from '../../../shared/status'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

interface StatusRow {
  org_id: string
  sales: SalesStatus
  congestion: CongestionLevel | null
  updated_at: number
}

function toOrgStatus(row: StatusRow): OrgStatus {
  return {
    orgId: row.org_id,
    sales: row.sales,
    congestion: row.congestion,
    updatedAt: row.updated_at,
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

type Auth = { kind: 'org'; orgId: string } | { kind: 'admin' }

async function authorize(request: Request, env: Env): Promise<Auth | null> {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) return null
  const org = await env.DB.prepare('SELECT org_id FROM org_tokens WHERE token = ?1')
    .bind(token)
    .first<{ org_id: string }>()
  if (org) return { kind: 'org', orgId: org.org_id }
  const admin = await env.DB.prepare('SELECT token FROM admin_tokens WHERE token = ?1')
    .bind(token)
    .first()
  return admin ? { kind: 'admin' } : null
}

interface SubmitWindow {
  from: number | null
  until: number | null
}

async function getWindow(env: Env): Promise<SubmitWindow> {
  const row = await env.DB.prepare(
    'SELECT accept_from, accept_until FROM app_settings WHERE id = 1',
  ).first<{ accept_from: number | null; accept_until: number | null }>()
  return { from: row?.accept_from ?? null, until: row?.accept_until ?? null }
}

function isWindowOpen(window: SubmitWindow): boolean {
  const now = Math.floor(Date.now() / 1000)
  if (window.from !== null && now < window.from) return false
  if (window.until !== null && now > window.until) return false
  return true
}

async function getAllStatuses(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT org_id, sales, congestion, updated_at FROM org_status',
  ).all<StatusRow>()
  return json(results.map(toOrgStatus))
}

async function getMe(request: Request, env: Env): Promise<Response> {
  const auth = await authorize(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  const window = await getWindow(env)
  if (auth.kind === 'admin') {
    const { results } = await env.DB.prepare('SELECT org_id FROM org_tokens ORDER BY org_id').all<{
      org_id: string
    }>()
    return json({ admin: true, orgs: results.map((row) => row.org_id), window })
  }
  const row = await env.DB.prepare(
    'SELECT org_id, sales, congestion, updated_at FROM org_status WHERE org_id = ?1',
  )
    .bind(auth.orgId)
    .first<StatusRow>()
  return json({ orgId: auth.orgId, status: row ? toOrgStatus(row) : null, window })
}

async function postStatus(request: Request, env: Env): Promise<Response> {
  const auth = await authorize(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const { sales, congestion, orgId: bodyOrgId } = (body ?? {}) as Record<string, unknown>
  if (!isSalesStatus(sales)) {
    return json({ error: 'invalid_value' }, 400)
  }
  let congestionValue: CongestionLevel | null = null
  if (hidesCongestion(sales)) {
    if (congestion != null) return json({ error: 'invalid_value' }, 400)
  } else {
    if (!isCongestionLevel(congestion)) return json({ error: 'invalid_value' }, 400)
    congestionValue = congestion
  }

  let orgId: string
  if (auth.kind === 'admin') {
    if (typeof bodyOrgId !== 'string' || bodyOrgId === '') {
      return json({ error: 'invalid_value' }, 400)
    }
    const org = await env.DB.prepare('SELECT org_id FROM org_tokens WHERE org_id = ?1')
      .bind(bodyOrgId)
      .first()
    if (!org) return json({ error: 'unknown_org' }, 400)
    orgId = bodyOrgId
  } else {
    if (!isWindowOpen(await getWindow(env))) return json({ error: 'closed' }, 403)
    orgId = auth.orgId
  }

  const row = await env.DB.prepare(
    `INSERT INTO org_status (org_id, sales, congestion, updated_at)
     VALUES (?1, ?2, ?3, unixepoch())
     ON CONFLICT (org_id) DO UPDATE
     SET sales = excluded.sales, congestion = excluded.congestion, updated_at = excluded.updated_at
     RETURNING org_id, sales, congestion, updated_at`,
  )
    .bind(orgId, sales, congestionValue)
    .first<StatusRow>()
  if (!row) return json({ error: 'write_failed' }, 500)
  return json(toOrgStatus(row))
}

async function putWindow(request: Request, env: Env): Promise<Response> {
  const auth = await authorize(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  if (auth.kind !== 'admin') return json({ error: 'forbidden' }, 403)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const { from, until } = (body ?? {}) as Record<string, unknown>
  const isEpochOrNull = (value: unknown): value is number | null =>
    value === null || (typeof value === 'number' && Number.isSafeInteger(value))
  if (!isEpochOrNull(from) || !isEpochOrNull(until)) {
    return json({ error: 'invalid_value' }, 400)
  }
  if (from !== null && until !== null && from > until) {
    return json({ error: 'invalid_value' }, 400)
  }

  await env.DB.prepare(
    `INSERT INTO app_settings (id, accept_from, accept_until)
     VALUES (1, ?1, ?2)
     ON CONFLICT (id) DO UPDATE
     SET accept_from = excluded.accept_from, accept_until = excluded.accept_until`,
  )
    .bind(from, until)
    .run()
  return json({ from, until })
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (pathname === '/api/status') {
      if (request.method === 'GET') return getAllStatuses(env)
      if (request.method === 'POST') return postStatus(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/me') {
      if (request.method === 'GET') return getMe(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/window') {
      if (request.method === 'PUT') return putWindow(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
