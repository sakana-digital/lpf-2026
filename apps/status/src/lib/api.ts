import type { CongestionLevel, OrgStatus, SalesStatus } from '../../../../shared/status'

export interface SubmitWindow {
  from: number | null
  until: number | null
}

export interface OrgMeResponse {
  orgId: string
  status: OrgStatus | null
  window: SubmitWindow
}

export interface AdminMeResponse {
  admin: true
  orgs: string[]
  window: SubmitWindow
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

export function updateWindow(token: string, window: SubmitWindow): Promise<SubmitWindow> {
  return request('/api/window', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(window),
  })
}

export async function getAllStatuses(): Promise<OrgStatus[]> {
  const res = await fetch('/api/status')
  if (!res.ok) throw new ApiError(res.status)
  return res.json() as Promise<OrgStatus[]>
}
