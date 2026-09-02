function classOrgParams(orgId: string): { grade: number; classNo: number } | null {
  const match = /^c(\d)-(\d)$/.exec(orgId)
  if (!match) return null
  return { grade: Number(match[1]), classNo: Number(match[2]) }
}

export function classOrgLabel(orgId: string): string {
  const params = classOrgParams(orgId)
  return params ? `${params.grade}年${params.classNo}組` : orgId
}
