import type { CongestionLevel, OrgStatus, SalesStatus } from '../../../../shared/status'

export interface MeResponse {
  orgId: string
  status: OrgStatus | null
}

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
  congestion: CongestionLevel,
): Promise<OrgStatus> {
  return request('/api/status', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sales, congestion }),
  })
}
