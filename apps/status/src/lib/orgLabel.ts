export function classOrgParams(orgId: string): { grade: number; classNo: number } | null {
  const match = /^c(\d)-(\d)$/.exec(orgId)
  if (!match) return null
  return { grade: Number(match[1]), classNo: Number(match[2]) }
}
