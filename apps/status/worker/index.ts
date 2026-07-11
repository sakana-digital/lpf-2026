import {
  hidesCongestion,
  isCongestionLevel,
  isSalesStatus,
  isSubmitOpen,
} from '../../../shared/status'
import type { Env } from '../worker-configuration'
import type {
  CongestionLevel,
  OrgStatus,
  SalesStatus,
  SignageConfig,
  SignagePayload,
  SignageUploadedPart,
  SignageVideo,
  SubmitWindow,
  SubmitWindows,
} from '../../../shared/status'

const SIGNAGE_COOKIE = 'signage-session'
const SIGNAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const VIDEO_PREFIX = 'signage/videos/'
const VIDEO_MAX_SIZE = 1024 ** 3
const VIDEO_PART_SIZE = 16 * 1024 ** 2
const FOOTER_MAX_LENGTH = 120
const ALERT_MAX_LENGTH = 200

interface StatusRow {
  org_id: string
  sales: SalesStatus
  congestion: CongestionLevel | null
  updated_at: number
}

interface SignageConfigRow {
  org_ids: string
  active_video_key: string | null
  footer_text: string
  alert_enabled: number
  alert_text: string
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

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Cache-Control', 'no-store')
  return Response.json(data, {
    status,
    headers: responseHeaders,
  })
}

type Auth = { kind: 'org'; orgId: string } | { kind: 'admin' }

function bearerToken(request: Request): string {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
}

function cookieToken(request: Request): string {
  const cookie = request.headers.get('Cookie') ?? ''
  for (const part of cookie.split(';')) {
    const [name, ...value] = part.trim().split('=')
    if (name === SIGNAGE_COOKIE) return decodeURIComponent(value.join('='))
  }
  return ''
}

async function authorizeToken(token: string, env: Env): Promise<Auth | null> {
  if (!token) return null
  const tokenHash = await sha256(token)
  const org = await env.DB.prepare('SELECT org_id FROM org_tokens WHERE token_hash = ?1')
    .bind(tokenHash)
    .first<{ org_id: string }>()
  if (org) return { kind: 'org', orgId: org.org_id }
  const admin = await env.DB.prepare('SELECT token_hash FROM admin_tokens WHERE token_hash = ?1')
    .bind(tokenHash)
    .first()
  return admin ? { kind: 'admin' } : null
}

async function authorize(request: Request, env: Env): Promise<Auth | null> {
  return authorizeToken(bearerToken(request), env)
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function isViewerToken(token: string, env: Env): Promise<boolean> {
  if (!token) return false
  const row = await env.DB.prepare(
    'SELECT id FROM signage_viewer_auth WHERE id = 1 AND token_hash = ?1',
  )
    .bind(await sha256(token))
    .first()
  return row !== null
}

async function authorizeSignage(
  request: Request,
  env: Env,
): Promise<{ kind: 'admin'; token: string } | { kind: 'viewer'; token: string } | null> {
  const bearer = bearerToken(request)
  if (bearer) {
    const auth = await authorizeToken(bearer, env)
    if (auth?.kind === 'admin') return { kind: 'admin', token: bearer }
  }
  const cookie = cookieToken(request)
  if (!cookie) return null
  const auth = await authorizeToken(cookie, env)
  if (auth?.kind === 'admin') return { kind: 'admin', token: cookie }
  return (await isViewerToken(cookie, env)) ? { kind: 'viewer', token: cookie } : null
}

async function requireAdmin(request: Request, env: Env): Promise<Auth | Response> {
  const auth = await authorize(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  if (auth.kind !== 'admin') return json({ error: 'forbidden' }, 403)
  return auth
}

function sessionCookie(token: string, requestUrl: string): string {
  const secure = new URL(requestUrl).protocol === 'https:' ? '; Secure' : ''
  return `${SIGNAGE_COOKIE}=${encodeURIComponent(token)}; Path=/api/signage; HttpOnly; SameSite=Strict; Max-Age=${SIGNAGE_COOKIE_MAX_AGE}${secure}`
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

async function fetchOrgIds(env: Env): Promise<string[]> {
  const { results } = await env.DB.prepare('SELECT org_id FROM org_tokens ORDER BY org_id').all<{
    org_id: string
  }>()
  return results.map((row) => row.org_id)
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
    const [orgs, statuses] = await Promise.all([fetchOrgIds(env), fetchStatuses(env)])
    return json({ admin: true, orgs, windows, statuses })
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
  if (!isSalesStatus(sales)) return json({ error: 'invalid_value' }, 400)
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
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth

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

function parseOrgIds(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string') ? parsed : []
  } catch {
    return []
  }
}

async function fetchSignageConfig(env: Env): Promise<SignageConfig> {
  const row = await env.DB.prepare(
    `SELECT org_ids, active_video_key, footer_text, alert_enabled, alert_text, updated_at
     FROM signage_config WHERE id = 1`,
  ).first<SignageConfigRow>()
  if (!row) {
    return {
      orgIds: await fetchOrgIds(env),
      activeVideoKey: null,
      footerText: '',
      alertEnabled: false,
      alertText: '',
      updatedAt: 0,
    }
  }
  const savedOrgIds = parseOrgIds(row.org_ids)
  return {
    orgIds: savedOrgIds.length > 0 ? savedOrgIds : await fetchOrgIds(env),
    activeVideoKey: row.active_video_key,
    footerText: row.footer_text,
    alertEnabled: row.alert_enabled === 1,
    alertText: row.alert_text,
    updatedAt: row.updated_at,
  }
}

async function getSignage(request: Request, env: Env): Promise<Response> {
  const auth = await authorizeSignage(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  const [config, allStatuses] = await Promise.all([fetchSignageConfig(env), fetchStatuses(env)])
  const selected = new Set(config.orgIds)
  const payload: SignagePayload = {
    config,
    statuses: allStatuses.filter((status) => selected.has(status.orgId)),
    version: config.updatedAt,
  }
  const headers =
    auth.kind === 'admin' ? { 'Set-Cookie': sessionCookie(auth.token, request.url) } : undefined
  return json(payload, 200, headers)
}

async function putSignageConfig(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const raw = (body ?? {}) as Record<string, unknown>
  if (
    !Array.isArray(raw.orgIds) ||
    raw.orgIds.length === 0 ||
    !raw.orgIds.every((id) => typeof id === 'string') ||
    new Set(raw.orgIds).size !== raw.orgIds.length ||
    (raw.activeVideoKey !== null && typeof raw.activeVideoKey !== 'string') ||
    typeof raw.footerText !== 'string' ||
    raw.footerText.length > FOOTER_MAX_LENGTH ||
    typeof raw.alertEnabled !== 'boolean' ||
    typeof raw.alertText !== 'string' ||
    raw.alertText.length > ALERT_MAX_LENGTH
  ) {
    return json({ error: 'invalid_value' }, 400)
  }

  const knownOrgIds = new Set(await fetchOrgIds(env))
  if (!raw.orgIds.every((id) => knownOrgIds.has(id as string))) {
    return json({ error: 'unknown_org' }, 400)
  }
  if (raw.activeVideoKey !== null) {
    if (!raw.activeVideoKey.startsWith(VIDEO_PREFIX)) return json({ error: 'invalid_video' }, 400)
    if (!(await env.SIGNAGE_MEDIA.head(raw.activeVideoKey)))
      return json({ error: 'invalid_video' }, 400)
  }

  const row = await env.DB.prepare(
    `UPDATE signage_config
     SET org_ids = ?1, active_video_key = ?2, footer_text = ?3,
         alert_enabled = ?4, alert_text = ?5, updated_at = unixepoch()
     WHERE id = 1
     RETURNING org_ids, active_video_key, footer_text, alert_enabled, alert_text, updated_at`,
  )
    .bind(
      JSON.stringify(raw.orgIds),
      raw.activeVideoKey,
      raw.footerText,
      raw.alertEnabled ? 1 : 0,
      raw.alertText,
    )
    .first<SignageConfigRow>()
  if (!row) return json({ error: 'write_failed' }, 500)
  return json({
    orgIds: parseOrgIds(row.org_ids),
    activeVideoKey: row.active_video_key,
    footerText: row.footer_text,
    alertEnabled: row.alert_enabled === 1,
    alertText: row.alert_text,
    updatedAt: row.updated_at,
  } satisfies SignageConfig)
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function issueViewerToken(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  const token = randomToken()
  await env.DB.prepare(
    `INSERT INTO signage_viewer_auth (id, token_hash, updated_at)
     VALUES (1, ?1, unixepoch())
     ON CONFLICT (id) DO UPDATE SET token_hash = excluded.token_hash, updated_at = excluded.updated_at`,
  )
    .bind(await sha256(token))
    .run()
  const url = new URL('/signage', request.url)
  url.searchParams.set('t', token)
  return json({ url: url.toString() })
}

async function bootstrapSignage(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url)
  const token = url.searchParams.get('t') ?? ''
  if (!token) return null
  url.searchParams.delete('t')
  if (!(await isViewerToken(token, env))) {
    url.searchParams.set('auth', 'invalid')
    return Response.redirect(url.toString(), 302)
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': sessionCookie(token, request.url),
      'Cache-Control': 'no-store',
    },
  })
}

async function listVideos(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  const listed = await env.SIGNAGE_MEDIA.list({
    prefix: VIDEO_PREFIX,
    limit: 1000,
    include: ['customMetadata'],
  })
  const videos: SignageVideo[] = listed.objects.map((object) => ({
    key: object.key,
    name: object.customMetadata?.originalName ?? object.key.slice(VIDEO_PREFIX.length),
    size: object.size,
    uploadedAt: Math.floor(object.uploaded.getTime() / 1000),
  }))
  videos.sort((a, b) => b.uploadedAt - a.uploadedAt)
  return json(videos)
}

async function deleteVideo(request: Request, env: Env, encodedKey: string): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  const key = decodeURIComponent(encodedKey)
  if (!key.startsWith(VIDEO_PREFIX)) return json({ error: 'invalid_video' }, 400)
  const config = await fetchSignageConfig(env)
  if (config.activeVideoKey === key) return json({ error: 'video_in_use' }, 409)
  await env.SIGNAGE_MEDIA.delete(key)
  return new Response(null, { status: 204 })
}

async function startUpload(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const { name, size, type } = (body ?? {}) as Record<string, unknown>
  if (
    typeof name !== 'string' ||
    name.length === 0 ||
    name.length > 255 ||
    !name.toLowerCase().endsWith('.mp4') ||
    type !== 'video/mp4' ||
    typeof size !== 'number' ||
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > VIDEO_MAX_SIZE
  ) {
    return json({ error: 'invalid_video' }, 400)
  }
  const key = `${VIDEO_PREFIX}${crypto.randomUUID()}.mp4`
  const upload = await env.SIGNAGE_MEDIA.createMultipartUpload(key, {
    httpMetadata: { contentType: 'video/mp4', cacheControl: 'private, max-age=3600' },
    customMetadata: { originalName: name },
  })
  return json({ key, uploadId: upload.uploadId, partSize: VIDEO_PART_SIZE }, 201)
}

function resumedUpload(
  env: Env,
  uploadId: string,
  keyValue: string | null,
): R2MultipartUpload | Response {
  const key = keyValue ? decodeURIComponent(keyValue) : ''
  if (!key.startsWith(VIDEO_PREFIX) || !uploadId) return json({ error: 'invalid_upload' }, 400)
  return env.SIGNAGE_MEDIA.resumeMultipartUpload(key, decodeURIComponent(uploadId))
}

async function uploadPart(
  request: Request,
  env: Env,
  uploadId: string,
  partValue: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  const upload = resumedUpload(env, uploadId, new URL(request.url).searchParams.get('key'))
  if (upload instanceof Response) return upload
  const partNumber = Number(partValue)
  const contentLength = Number(request.headers.get('Content-Length') ?? '0')
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 64 || !request.body) {
    return json({ error: 'invalid_part' }, 400)
  }
  if (contentLength > VIDEO_PART_SIZE) return json({ error: 'part_too_large' }, 413)
  try {
    return json(await upload.uploadPart(partNumber, request.body))
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'signage_upload_part_failed', partNumber, error: String(error) }),
    )
    return json({ error: 'upload_failed' }, 502)
  }
}

async function completeUpload(request: Request, env: Env, uploadId: string): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  const { key, parts } = (body ?? {}) as Record<string, unknown>
  const upload = resumedUpload(env, uploadId, typeof key === 'string' ? key : null)
  if (upload instanceof Response) return upload
  if (
    !Array.isArray(parts) ||
    parts.length === 0 ||
    !parts.every(
      (part): part is SignageUploadedPart =>
        typeof part === 'object' &&
        part !== null &&
        Number.isInteger((part as SignageUploadedPart).partNumber) &&
        typeof (part as SignageUploadedPart).etag === 'string',
    )
  ) {
    return json({ error: 'invalid_parts' }, 400)
  }
  try {
    const object = await upload.complete(parts)
    return json({ key: object.key, etag: object.httpEtag })
  } catch (error) {
    console.error(JSON.stringify({ event: 'signage_upload_complete_failed', error: String(error) }))
    return json({ error: 'upload_failed' }, 502)
  }
}

async function abortUpload(request: Request, env: Env, uploadId: string): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  const upload = resumedUpload(env, uploadId, new URL(request.url).searchParams.get('key'))
  if (upload instanceof Response) return upload
  await upload.abort()
  return new Response(null, { status: 204 })
}

function normalizedRange(range: R2Range, size: number): { start: number; length: number } {
  if ('suffix' in range && typeof range.suffix === 'number') {
    const length = Math.min(range.suffix, size)
    return { start: size - length, length }
  }
  const offset = 'offset' in range && typeof range.offset === 'number' ? range.offset : 0
  const length =
    'length' in range && typeof range.length === 'number' ? range.length : size - offset
  return { start: offset, length }
}

async function streamVideo(request: Request, env: Env, encodedKey: string): Promise<Response> {
  const auth = await authorizeSignage(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  const key = decodeURIComponent(encodedKey)
  if (!key.startsWith(VIDEO_PREFIX)) return json({ error: 'not_found' }, 404)
  if (auth.kind === 'viewer' && (await fetchSignageConfig(env)).activeVideoKey !== key) {
    return json({ error: 'not_found' }, 404)
  }
  const object = await env.SIGNAGE_MEDIA.get(key, {
    onlyIf: request.headers,
    range: request.headers,
  })
  if (!object) return json({ error: 'not_found' }, 404)

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('ETag', object.httpEtag)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=3600')
  if (!('body' in object)) {
    const notModified =
      request.headers.has('If-None-Match') || request.headers.has('If-Modified-Since')
    return new Response(null, { status: notModified ? 304 : 412, headers })
  }
  let status = 200
  if (object.range) {
    const { start, length } = normalizedRange(object.range, object.size)
    headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${object.size}`)
    headers.set('Content-Length', String(length))
    status = 206
  } else {
    headers.set('Content-Length', String(object.size))
  }
  return new Response(object.body, { status, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    if (pathname === '/signage' || pathname === '/signage/') {
      const response = await bootstrapSignage(request, env)
      if (response) return response
      return env.ASSETS.fetch(request)
    }
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
    if (pathname === '/api/signage') {
      if (request.method === 'GET') return getSignage(request, env)
      if (request.method === 'PUT') return putSignageConfig(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/signage/viewer-token') {
      if (request.method === 'POST') return issueViewerToken(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/signage/videos') {
      if (request.method === 'GET') return listVideos(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname.startsWith('/api/signage/videos/')) {
      if (request.method === 'DELETE') {
        return deleteVideo(request, env, pathname.slice('/api/signage/videos/'.length))
      }
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/signage/uploads') {
      if (request.method === 'POST') return startUpload(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    const uploadPartMatch = /^\/api\/signage\/uploads\/([^/]+)\/parts\/(\d+)$/.exec(pathname)
    if (uploadPartMatch) {
      if (request.method === 'PUT')
        return uploadPart(request, env, uploadPartMatch[1]!, uploadPartMatch[2]!)
      return json({ error: 'method_not_allowed' }, 405)
    }
    const uploadActionMatch = /^\/api\/signage\/uploads\/([^/]+)\/(complete)$/.exec(pathname)
    if (uploadActionMatch) {
      if (request.method === 'POST') return completeUpload(request, env, uploadActionMatch[1]!)
      return json({ error: 'method_not_allowed' }, 405)
    }
    const uploadMatch = /^\/api\/signage\/uploads\/([^/]+)$/.exec(pathname)
    if (uploadMatch) {
      if (request.method === 'DELETE') return abortUpload(request, env, uploadMatch[1]!)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname.startsWith('/api/signage/video/')) {
      if (request.method === 'GET') {
        return streamVideo(request, env, pathname.slice('/api/signage/video/'.length))
      }
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
