import type {
  CongestionLevel,
  OrgStatus,
  SalesStatus,
  SignageConfig,
  SignagePayload,
  SignageUploadedPart,
  SignageUploadStartResponse,
  SignageVideo,
  SubmitWindows,
} from '../../../../shared/status'

export interface OrgMeResponse {
  orgId: string
  status: OrgStatus | null
  windows: SubmitWindows
}

export interface AdminMeResponse {
  admin: true
  orgs: string[]
  windows: SubmitWindows
  statuses: OrgStatus[]
}

export type MeResponse = OrgMeResponse | AdminMeResponse

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`api error: ${status}`)
  }
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<T>
}

export function getMe(token: string): Promise<MeResponse> {
  return request('/api/me', token)
}

export function updateStatus(
  token: string,
  sales: SalesStatus,
  congestion: CongestionLevel | null,
  orgId?: string,
): Promise<OrgStatus> {
  return request('/api/status', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orgId ? { sales, congestion, orgId } : { sales, congestion }),
  })
}

export function updateWindows(token: string, windows: SubmitWindows): Promise<SubmitWindows> {
  return request('/api/window', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(windows),
  })
}

export function getSignageAdmin(token: string): Promise<SignagePayload> {
  return request('/api/signage', token)
}

export function updateSignageConfig(
  token: string,
  config: Omit<SignageConfig, 'updatedAt'>,
): Promise<SignageConfig> {
  return request('/api/signage', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
}

export function issueSignageViewerToken(token: string): Promise<{ url: string }> {
  return request('/api/signage/viewer-token', token, { method: 'POST' })
}

export function getSignageVideos(token: string): Promise<SignageVideo[]> {
  return request('/api/signage/videos', token)
}

export async function deleteSignageVideo(token: string, key: string): Promise<void> {
  const headers = new Headers({ Authorization: `Bearer ${token}` })
  const response = await fetch(`/api/signage/videos/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers,
  })
  if (!response.ok) throw new ApiError(response.status)
}

export function startSignageUpload(token: string, file: File): Promise<SignageUploadStartResponse> {
  return request('/api/signage/uploads', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
  })
}

export function uploadSignagePart(
  token: string,
  upload: SignageUploadStartResponse,
  partNumber: number,
  body: Blob,
  signal?: AbortSignal,
): Promise<SignageUploadedPart> {
  return request(
    `/api/signage/uploads/${encodeURIComponent(upload.uploadId)}/parts/${partNumber}?key=${encodeURIComponent(upload.key)}`,
    token,
    { method: 'PUT', body, signal },
  )
}

export function completeSignageUpload(
  token: string,
  upload: SignageUploadStartResponse,
  parts: SignageUploadedPart[],
): Promise<{ key: string; etag: string }> {
  return request(`/api/signage/uploads/${encodeURIComponent(upload.uploadId)}/complete`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: upload.key, parts }),
  })
}

export async function abortSignageUpload(
  token: string,
  upload: SignageUploadStartResponse,
): Promise<void> {
  const headers = new Headers({ Authorization: `Bearer ${token}` })
  const response = await fetch(
    `/api/signage/uploads/${encodeURIComponent(upload.uploadId)}?key=${encodeURIComponent(upload.key)}`,
    { method: 'DELETE', headers },
  )
  if (!response.ok) throw new ApiError(response.status)
}
