/// <reference types="@cloudflare/workers-types" />
import { isCongestionLevel, isSalesStatus } from '../../../shared/status'
import type { CongestionLevel, OrgStatus, SalesStatus } from '../../../shared/status'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
}

interface StatusRow {
  org_id: string
  sales: SalesStatus
  congestion: CongestionLevel
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

async function authorize(request: Request, env: Env): Promise<string | null> {
  const header = request.headers.get('Authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) return null
  const row = await env.DB.prepare('SELECT org_id FROM org_tokens WHERE token = ?1')
    .bind(token)
    .first<{ org_id: string }>()
  return row?.org_id ?? null
}

async function getAllStatuses(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT org_id, sales, congestion, updated_at FROM org_status',
  ).all<StatusRow>()
  return json(results.map(toOrgStatus))
}

async function getMe(request: Request, env: Env): Promise<Response> {
  const orgId = await authorize(request, env)
  if (!orgId) return json({ error: 'unauthorized' }, 401)
  const row = await env.DB.prepare(
    'SELECT org_id, sales, congestion, updated_at FROM org_status WHERE org_id = ?1',
  )
    .bind(orgId)
    .first<StatusRow>()
  return json({ orgId, status: row ? toOrgStatus(row) : null })
}

async function postStatus(request: Request, env: Env): Promise<Response> {
  const orgId = await authorize(request, env)
  if (!orgId) return json({ error: 'unauthorized' }, 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const { sales, congestion } = (body ?? {}) as Record<string, unknown>
  if (!isSalesStatus(sales) || !isCongestionLevel(congestion)) {
    return json({ error: 'invalid_value' }, 400)
  }

  const row = await env.DB.prepare(
    `INSERT INTO org_status (org_id, sales, congestion, updated_at)
     VALUES (?1, ?2, ?3, unixepoch())
     ON CONFLICT (org_id) DO UPDATE
     SET sales = excluded.sales, congestion = excluded.congestion, updated_at = excluded.updated_at
     RETURNING org_id, sales, congestion, updated_at`,
  )
    .bind(orgId, sales, congestion)
    .first<StatusRow>()
  if (!row) return json({ error: 'write_failed' }, 500)
  return json(toOrgStatus(row))
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
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
