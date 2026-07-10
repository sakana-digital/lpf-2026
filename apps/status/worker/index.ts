/// <reference types="@cloudflare/workers-types" />
import {
  SUBMIT_DAYS,
  hidesCongestion,
  isCongestionLevel,
  isSalesStatus,
  isSubmitOpen,
} from '../../../shared/status'
import type {
  CongestionLevel,
  OrgStatus,
  SalesStatus,
  SubmitWindow,
  SubmitWindows,
} from '../../../shared/status'

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

interface WindowRow {
  day: number
  accept_from: number | null
  accept_until: number | null
}

async function getWindows(env: Env): Promise<SubmitWindows> {
  const { results } = await env.DB.prepare(
    'SELECT day, accept_from, accept_until FROM submit_windows',
  ).all<WindowRow>()
  const windows: SubmitWindows = {
    day1: { from: null, until: null },
    day2: { from: null, until: null },
  }
  for (const row of results) {
    const key = row.day === 1 ? 'day1' : row.day === 2 ? 'day2' : null
    if (key) windows[key] = { from: row.accept_from, until: row.accept_until }
  }
  return windows
}

async function fetchStatuses(env: Env): Promise<OrgStatus[]> {
  const { results } = await env.DB.prepare(
    'SELECT org_id, sales, congestion, updated_at FROM org_status',
  ).all<StatusRow>()
  return results.map(toOrgStatus)
}

async function getAllStatuses(env: Env): Promise<Response> {
  const windows = await getWindows(env)
  if (!isSubmitOpen(windows, Math.floor(Date.now() / 1000))) return json([])
  return json(await fetchStatuses(env))
}

async function getMe(request: Request, env: Env): Promise<Response> {
  const auth = await authorize(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  const windows = await getWindows(env)
  if (auth.kind === 'admin') {
    const { results } = await env.DB.prepare('SELECT org_id FROM org_tokens ORDER BY org_id').all<{
      org_id: string
    }>()
    const statuses = await fetchStatuses(env)
    return json({ admin: true, orgs: results.map((row) => row.org_id), windows, statuses })
  }
  const row = await env.DB.prepare(
    'SELECT org_id, sales, congestion, updated_at FROM org_status WHERE org_id = ?1',
  )
    .bind(auth.orgId)
    .first<StatusRow>()
  return json({ orgId: auth.orgId, status: row ? toOrgStatus(row) : null, windows })
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
    if (!isSubmitOpen(await getWindows(env), Math.floor(Date.now() / 1000))) {
      return json({ error: 'closed' }, 403)
    }
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
  const isEpochOrNull = (value: unknown): value is number | null =>
    value === null || (typeof value === 'number' && Number.isSafeInteger(value))
  const parseWindow = (value: unknown): SubmitWindow | null => {
    const { from, until } = (value ?? {}) as Record<string, unknown>
    if (!isEpochOrNull(from) || !isEpochOrNull(until)) return null
    if (from !== null && until !== null && from > until) return null
    return { from, until }
  }
  const raw = (body ?? {}) as Record<string, unknown>
  const day1 = parseWindow(raw.day1)
  const day2 = parseWindow(raw.day2)
  if (!day1 || !day2) return json({ error: 'invalid_value' }, 400)

  const upsert = env.DB.prepare(
    `INSERT INTO submit_windows (day, accept_from, accept_until)
     VALUES (?1, ?2, ?3)
     ON CONFLICT (day) DO UPDATE
     SET accept_from = excluded.accept_from, accept_until = excluded.accept_until`,
  )
  await env.DB.batch([upsert.bind(1, day1.from, day1.until), upsert.bind(2, day2.from, day2.until)])
  return json({ day1, day2 })
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
