import type { Env } from './env'
import {
  hidesCongestion,
  isCongestionLevel,
  isSalesStatus,
  defaultSubmitWindows,
  isStatusOrg,
  isSubmitOpen,
  parseSubmitWindow,
  SIGNAGE_MEDIA_KINDS,
  STATUS_HISTORY_LIMIT,
  submitAllow,
} from '../../../shared/status'
import type {
  CongestionLevel,
  OrgStatus,
  SalesStatus,
  SignageConfig,
  SignageMedia,
  SignageMediaKind,
  SignagePayload,
  SignageUploadedPart,
  StatusHistoryEntry,
  StatusSource,
  SubmitWindows,
  TestSince,
} from '../../../shared/status'

const SIGNAGE_COOKIE = 'signage-session'
const SIGNAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const MEDIA_PART_SIZE = 16 * 1024 ** 2
// Every upload gets its own key, so a viewer never has to revalidate.
const MEDIA_CACHE_CONTROL = 'private, max-age=86400, immutable'

interface MediaKindSpec {
  prefix: string
  maxSize: number
  /** Extension the file has to carry, mapped to the type R2 serves it back with. */
  extensions: Record<string, string>
  /** Browsers disagree on what they report for the same extension. */
  accepts: readonly string[]
}

const MEDIA_KINDS: Record<SignageMediaKind, MediaKindSpec> = {
  video: {
    prefix: 'signage/videos/',
    maxSize: 1024 ** 3,
    extensions: { '.mp4': 'video/mp4' },
    accepts: ['video/mp4'],
  },
  audio: {
    prefix: 'signage/audios/',
    maxSize: 64 * 1024 ** 2,
    extensions: { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' },
    accepts: ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac'],
  },
}

const FOOTER_MAX_LENGTH = 120
const ALERT_MAX_LENGTH = 200
const PUBLIC_STATUS_MAX_AGE = 15
const WORKER_DOMAIN_SUFFIX = '.workers.dev'

interface StatusRow {
  org_id: string
  sales: SalesStatus
  congestion: CongestionLevel | null
  updated_at: number
}

interface StatusLogRow {
  org_id: string
  sales: SalesStatus
  congestion: CongestionLevel | null
  source: StatusSource
  created_at: number
}

interface SignageConfigRow {
  active_video_key: string | null
  video_start_at: number | null
  active_audio_key: string | null
  audio_start_at: number | null
  footer_text: string
  alert_enabled: number
  alert_text: string
  updated_at: number
}

function mediaKindOf(key: string): SignageMediaKind | null {
  return SIGNAGE_MEDIA_KINDS.find((kind) => key.startsWith(MEDIA_KINDS[kind].prefix)) ?? null
}

function activeMediaKey(config: SignageConfig, kind: SignageMediaKind): string | null {
  return kind === 'video' ? config.activeVideoKey : config.activeAudioKey
}

/** The public list is served through Pages only, so the Worker domain must not answer it. */
function servesPublicList(request: Request): boolean {
  return !new URL(request.url).hostname.endsWith(WORKER_DOMAIN_SUFFIX)
}

function toOrgStatus(row: StatusRow): OrgStatus {
  return {
    orgId: row.org_id,
    sales: row.sales,
    congestion: row.congestion,
    updatedAt: row.updated_at,
  }
}

function toHistoryEntry(row: StatusLogRow): StatusHistoryEntry {
  return {
    orgId: row.org_id,
    sales: row.sales,
    congestion: row.congestion,
    source: row.source,
    createdAt: row.created_at,
  }
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers)
  if (!responseHeaders.has('Cache-Control')) responseHeaders.set('Cache-Control', 'no-store')
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
  // Signage devices poll far more often than admins, so spend one query on them.
  if (await isViewerToken(cookie, env)) return { kind: 'viewer', token: cookie }
  const auth = await authorizeToken(cookie, env)
  return auth?.kind === 'admin' ? { kind: 'admin', token: cookie } : null
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
  accept_from: number
  accept_until: number
}

/** Saved hours per day, falling back to the opening hours for a day never saved. */
async function getWindows(env: Env): Promise<SubmitWindows> {
  const { results } = await env.DB.prepare(
    'SELECT day, accept_from, accept_until FROM submit_windows',
  ).all<WindowRow>()
  const windows = defaultSubmitWindows()
  for (const row of results) {
    const key = row.day === 1 ? 'day1' : row.day === 2 ? 'day2' : null
    if (key) windows[key] = { from: row.accept_from, until: row.accept_until }
  }
  return windows
}

/**
 * 0 with no rehearsal running, 1 while one does. Inlined into each statement so a query
 * scopes itself without a round trip to look the flag up first.
 */
const TEST_SCOPE = '(SELECT COUNT(*) FROM test_session)'

async function getTestSince(env: Env): Promise<TestSince> {
  const row = await env.DB.prepare('SELECT started_at FROM test_session WHERE id = 1').first<{
    started_at: number
  }>()
  return row?.started_at ?? null
}

/** A token issued to a group outside `STATUS_ORG_IDS` is not enough: such rows never show. */
async function fetchStatuses(env: Env): Promise<OrgStatus[]> {
  const { results } = await env.DB.prepare(
    `SELECT org_id, sales, congestion, updated_at FROM org_status WHERE test = ${TEST_SCOPE}`,
  ).all<StatusRow>()
  return results.map(toOrgStatus).filter((status) => isStatusOrg(status.orgId))
}

async function getAllStatuses(env: Env): Promise<Response> {
  const headers = { 'Cache-Control': `public, max-age=${PUBLIC_STATUS_MAX_AGE}` }
  const [windows, testSince] = await Promise.all([getWindows(env), getTestSince(env)])
  // Closed is the common case off-festival, so the statuses are only read once they can show.
  const open = testSince !== null || isSubmitOpen(windows, Math.floor(Date.now() / 1000))
  if (!open) return json([], 200, headers)
  return json(await fetchStatuses(env), 200, headers)
}

async function getMe(request: Request, env: Env): Promise<Response> {
  const auth = await authorize(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  if (auth.kind === 'admin') {
    const [windows, testSince, statuses] = await Promise.all([
      getWindows(env),
      getTestSince(env),
      fetchStatuses(env),
    ])
    return json({ admin: true, windows, testSince, statuses })
  }
  const [windows, testSince, row] = await Promise.all([
    getWindows(env),
    getTestSince(env),
    env.DB.prepare(
      `SELECT org_id, sales, congestion, updated_at FROM org_status
       WHERE org_id = ?1 AND test = ${TEST_SCOPE}`,
    )
      .bind(auth.orgId)
      .first<StatusRow>(),
  ])
  return json({
    orgId: auth.orgId,
    status: row ? toOrgStatus(row) : null,
    windows,
    testSince,
    accepted: isStatusOrg(auth.orgId),
  })
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

  const now = Math.floor(Date.now() / 1000)
  const [testSince, windows] = await Promise.all([getTestSince(env), getWindows(env)])
  let orgId: string
  if (auth.kind === 'admin') {
    if (typeof bodyOrgId !== 'string' || bodyOrgId === '') {
      return json({ error: 'invalid_value' }, 400)
    }
    if (!isStatusOrg(bodyOrgId)) return json({ error: 'unknown_org' }, 400)
    orgId = bodyOrgId
  } else {
    const permission = submitAllow(
      windows,
      now,
      { admin: false, accepted: isStatusOrg(auth.orgId) },
      testSince !== null,
    )
    if (!permission.allowed) return json({ error: permission.refusal }, 403)
    orgId = auth.orgId
  }

  const [updated] = await env.DB.batch<StatusRow>([
    env.DB.prepare(
      `INSERT INTO org_status (org_id, test, sales, congestion, updated_at)
       VALUES (?1, ${TEST_SCOPE}, ?2, ?3, ?4)
       ON CONFLICT (org_id, test) DO UPDATE
       SET sales = excluded.sales, congestion = excluded.congestion, updated_at = excluded.updated_at
       RETURNING org_id, sales, congestion, updated_at`,
    ).bind(orgId, sales, congestionValue, now),
    env.DB.prepare(
      `INSERT INTO org_status_log (org_id, test, sales, congestion, source, created_at)
       VALUES (?1, ${TEST_SCOPE}, ?2, ?3, ?4, ?5)`,
    ).bind(orgId, sales, congestionValue, auth.kind, now),
  ])
  const row = updated?.results[0]
  if (!row) return json({ error: 'write_failed' }, 500)
  return json(toOrgStatus(row))
}

async function getHistory(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth

  const orgId = new URL(request.url).searchParams.get('orgId')
  const columns = `SELECT org_id, sales, congestion, source, created_at FROM org_status_log
     WHERE test = ${TEST_SCOPE}`
  const query = orgId
    ? env.DB.prepare(`${columns} AND org_id = ?1 ORDER BY created_at DESC, id DESC LIMIT ?2`).bind(
        orgId,
        STATUS_HISTORY_LIMIT,
      )
    : env.DB.prepare(`${columns} ORDER BY created_at DESC, id DESC LIMIT ?1`).bind(
        STATUS_HISTORY_LIMIT,
      )
  const { results } = await query.all<StatusLogRow>()
  return json(results.map(toHistoryEntry))
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
  const raw = (body ?? {}) as Record<string, unknown>
  const day1 = parseSubmitWindow(raw.day1)
  const day2 = parseSubmitWindow(raw.day2)
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

async function startTest(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth

  // A rehearsal already running keeps its start; the test tables carry over untouched.
  await env.DB.prepare(
    'INSERT INTO test_session (id, started_at) VALUES (1, ?1) ON CONFLICT (id) DO NOTHING',
  )
    .bind(Math.floor(Date.now() / 1000))
    .run()
  return json({ testSince: await getTestSince(env) })
}

async function stopTest(request: Request, env: Env): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth

  // Only the rehearsal's own tables are emptied: the real data was never written to.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM org_status_log WHERE test = 1'),
    env.DB.prepare('DELETE FROM org_status WHERE test = 1'),
    env.DB.prepare('DELETE FROM test_session WHERE id = 1'),
  ])
  return json({ testSince: null })
}

function toSignageConfig(row: SignageConfigRow): SignageConfig {
  return {
    activeVideoKey: row.active_video_key,
    videoStartAt: row.video_start_at,
    activeAudioKey: row.active_audio_key,
    audioStartAt: row.audio_start_at,
    footerText: row.footer_text,
    alertEnabled: row.alert_enabled === 1,
    alertText: row.alert_text,
    updatedAt: row.updated_at,
  }
}

async function fetchSignageConfig(env: Env): Promise<SignageConfig> {
  const row = await env.DB.prepare(
    `SELECT active_video_key, video_start_at, active_audio_key, audio_start_at,
            footer_text, alert_enabled, alert_text, updated_at
     FROM signage_config WHERE id = 1`,
  ).first<SignageConfigRow>()
  if (!row) {
    return {
      activeVideoKey: null,
      videoStartAt: null,
      activeAudioKey: null,
      audioStartAt: null,
      footerText: '',
      alertEnabled: false,
      alertText: '',
      updatedAt: 0,
    }
  }
  return toSignageConfig(row)
}

async function getSignage(request: Request, env: Env): Promise<Response> {
  const auth = await authorizeSignage(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  const [config, statuses] = await Promise.all([fetchSignageConfig(env), fetchStatuses(env)])
  const payload: SignagePayload = { config, statuses, version: config.updatedAt }
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
  const videoStartAt = raw.videoStartAt ?? null
  const activeAudioKey = raw.activeAudioKey ?? null
  const audioStartAt = raw.audioStartAt ?? null
  if (
    (raw.activeVideoKey !== null && typeof raw.activeVideoKey !== 'string') ||
    (videoStartAt !== null && !Number.isSafeInteger(videoStartAt)) ||
    (activeAudioKey !== null && typeof activeAudioKey !== 'string') ||
    (audioStartAt !== null && !Number.isSafeInteger(audioStartAt)) ||
    typeof raw.footerText !== 'string' ||
    raw.footerText.length > FOOTER_MAX_LENGTH ||
    typeof raw.alertEnabled !== 'boolean' ||
    typeof raw.alertText !== 'string' ||
    raw.alertText.length > ALERT_MAX_LENGTH
  ) {
    return json({ error: 'invalid_value' }, 400)
  }

  const active: Record<SignageMediaKind, string | null> = {
    video: raw.activeVideoKey,
    audio: activeAudioKey,
  }
  for (const kind of SIGNAGE_MEDIA_KINDS) {
    const key = active[kind]
    if (key === null) continue
    if (mediaKindOf(key) !== kind) return json({ error: 'invalid_media' }, 400)
    if (!(await env.SIGNAGE_MEDIA.head(key))) return json({ error: 'invalid_media' }, 400)
  }

  const row = await env.DB.prepare(
    `UPDATE signage_config
     SET active_video_key = ?1, video_start_at = ?2, active_audio_key = ?3,
         audio_start_at = ?4, footer_text = ?5, alert_enabled = ?6, alert_text = ?7,
         updated_at = unixepoch()
     WHERE id = 1
     RETURNING active_video_key, video_start_at, active_audio_key, audio_start_at,
               footer_text, alert_enabled, alert_text, updated_at`,
  )
    .bind(
      raw.activeVideoKey,
      videoStartAt,
      activeAudioKey,
      audioStartAt,
      raw.footerText,
      raw.alertEnabled ? 1 : 0,
      raw.alertText,
    )
    .first<SignageConfigRow>()
  if (!row) return json({ error: 'write_failed' }, 500)
  return json(toSignageConfig(row))
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

async function listMedia(request: Request, env: Env, kind: SignageMediaKind): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  const { prefix } = MEDIA_KINDS[kind]
  const listed = await env.SIGNAGE_MEDIA.list({ prefix, limit: 1000, include: ['customMetadata'] })
  const media: SignageMedia[] = listed.objects.map((object) => ({
    key: object.key,
    name: object.customMetadata?.originalName ?? object.key.slice(prefix.length),
    size: object.size,
    uploadedAt: Math.floor(object.uploaded.getTime() / 1000),
  }))
  media.sort((a, b) => b.uploadedAt - a.uploadedAt)
  return json(media)
}

async function deleteMedia(
  request: Request,
  env: Env,
  kind: SignageMediaKind,
  encodedKey: string,
): Promise<Response> {
  const auth = await requireAdmin(request, env)
  if (auth instanceof Response) return auth
  const key = decodeURIComponent(encodedKey)
  if (mediaKindOf(key) !== kind) return json({ error: 'invalid_media' }, 400)
  if (activeMediaKey(await fetchSignageConfig(env), kind) === key) {
    return json({ error: 'media_in_use' }, 409)
  }
  await env.SIGNAGE_MEDIA.delete(key)
  return new Response(null, { status: 204 })
}

/** Which kind an upload belongs to, decided by the extension the file carries. */
function uploadTarget(
  name: string,
  type: string,
): { kind: SignageMediaKind; key: string; contentType: string } | null {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return null
  const extension = name.slice(dot).toLowerCase()
  for (const kind of SIGNAGE_MEDIA_KINDS) {
    const { prefix, extensions, accepts } = MEDIA_KINDS[kind]
    const contentType = extensions[extension]
    if (!contentType || !accepts.includes(type)) continue
    return { kind, key: `${prefix}${crypto.randomUUID()}${extension}`, contentType }
  }
  return null
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
    typeof type !== 'string' ||
    typeof size !== 'number' ||
    !Number.isSafeInteger(size) ||
    size <= 0
  ) {
    return json({ error: 'invalid_media' }, 400)
  }
  const target = uploadTarget(name, type)
  if (!target || size > MEDIA_KINDS[target.kind].maxSize) {
    return json({ error: 'invalid_media' }, 400)
  }
  const upload = await env.SIGNAGE_MEDIA.createMultipartUpload(target.key, {
    httpMetadata: { contentType: target.contentType, cacheControl: MEDIA_CACHE_CONTROL },
    customMetadata: { originalName: name },
  })
  return json({ key: target.key, uploadId: upload.uploadId, partSize: MEDIA_PART_SIZE }, 201)
}

function resumedUpload(
  env: Env,
  uploadId: string,
  keyValue: string | null,
): R2MultipartUpload | Response {
  const key = keyValue ? decodeURIComponent(keyValue) : ''
  if (!mediaKindOf(key) || !uploadId) return json({ error: 'invalid_upload' }, 400)
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
  if (contentLength > MEDIA_PART_SIZE) return json({ error: 'part_too_large' }, 413)
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

async function streamMedia(
  request: Request,
  env: Env,
  kind: SignageMediaKind,
  encodedKey: string,
): Promise<Response> {
  const auth = await authorizeSignage(request, env)
  if (!auth) return json({ error: 'unauthorized' }, 401)
  const key = decodeURIComponent(encodedKey)
  if (mediaKindOf(key) !== kind) return json({ error: 'not_found' }, 404)
  if (auth.kind === 'viewer' && activeMediaKey(await fetchSignageConfig(env), kind) !== key) {
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
  headers.set('Cache-Control', MEDIA_CACHE_CONTROL)
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
      if (request.method === 'GET') {
        if (!servesPublicList(request)) return json({ error: 'not_found' }, 404)
        return getAllStatuses(env)
      }
      if (request.method === 'POST') return postStatus(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/me') {
      if (request.method === 'GET') return getMe(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/history') {
      if (request.method === 'GET') return getHistory(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/window') {
      if (request.method === 'PUT') return putWindow(request, env)
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname === '/api/test') {
      if (request.method === 'POST') return startTest(request, env)
      if (request.method === 'DELETE') return stopTest(request, env)
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
    const listMatch = /^\/api\/signage\/(video|audio)s$/.exec(pathname)
    if (listMatch) {
      if (request.method === 'GET') return listMedia(request, env, listMatch[1] as SignageMediaKind)
      return json({ error: 'method_not_allowed' }, 405)
    }
    const deleteMatch = /^\/api\/signage\/(video|audio)s\/(.+)$/.exec(pathname)
    if (deleteMatch) {
      if (request.method === 'DELETE') {
        return deleteMedia(request, env, deleteMatch[1] as SignageMediaKind, deleteMatch[2]!)
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
    const streamMatch = /^\/api\/signage\/(video|audio)\/(.+)$/.exec(pathname)
    if (streamMatch) {
      if (request.method === 'GET') {
        return streamMedia(request, env, streamMatch[1] as SignageMediaKind, streamMatch[2]!)
      }
      return json({ error: 'method_not_allowed' }, 405)
    }
    if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404)

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
