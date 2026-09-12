/** The open tab, plus the group the status tab shows — kept apart so switching tabs never loses it. */
export interface AdminPage {
  view: 'status' | 'signage'
  orgId: string
}

/** Anything unrecognisable in storage lands on the status tab of the first organization. */
export function sanitizePage(value: unknown, orgs: readonly string[]): AdminPage {
  const first = orgs[0] ?? ''
  if (typeof value === 'object' && value !== null) {
    const { view, orgId } = value as Record<string, unknown>
    return {
      view: view === 'signage' ? 'signage' : 'status',
      orgId: typeof orgId === 'string' && orgs.includes(orgId) ? orgId : first,
    }
  }
  return { view: 'status', orgId: first }
}
