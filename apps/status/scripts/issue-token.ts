import { STATUS_ORG_IDS, isStatusOrg } from '../../../shared/status'
import { classOrgLabel } from '../src/lib/orgLabel'

/** Only what this script uses: the repo installs no Bun type package. */
declare const Bun: {
  readonly argv: string[]
  file(path: string): { exists(): Promise<boolean>; text(): Promise<string> }
  write(path: string, data: string): Promise<unknown>
  spawnSync(
    command: string[],
    options: { stderr: 'inherit' },
  ): { exitCode: number | null; stdout: Uint8Array }
}

declare const process: {
  readonly stderr: { write(chunk: Uint8Array): void }
  exit(code: number): never
}

const DATABASE = 'happo-sai-status'
const ORIGINS = {
  local: 'http://localhost:8787',
  remote: 'https://happo-sai-status.qkzfvwr5gc.workers.dev',
} as const

const ID_COLUMN = 'id'
const CSV_HEADER = `${ID_COLUMN},name,url`
const ADMIN_ID = 'admin'

interface Issued {
  id: string
  label: string
  token: string
  hash: string
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function issue(id: string, label: string): Promise<Issued> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return { id, label, token, hash: hex(new Uint8Array(digest)) }
}

function execute(sql: string, remote: boolean): void {
  const { exitCode, stdout } = Bun.spawnSync(
    [
      'bunx',
      'wrangler',
      'd1',
      'execute',
      DATABASE,
      remote ? '--remote' : '--local',
      '--command',
      sql,
    ],
    { stderr: 'inherit' },
  )
  // Keep stdout to the issued tokens alone so it can be piped
  process.stderr.write(stdout)
  if (exitCode !== 0) process.exit(exitCode ?? 1)
}

function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

/**
 * Distribution list of URLs, kept out of Git. Reissuing a subset must not drop
 * the rows this run left alone, so existing lines are merged rather than replaced.
 * A plain token lives nowhere else, so no existing row is dropped either.
 */
async function saveCsv(remote: boolean, issued: readonly Issued[]): Promise<string> {
  const path = `tokens.${remote ? 'remote' : 'local'}.csv`
  const origin = ORIGINS[remote ? 'remote' : 'local']
  const file = Bun.file(path)
  const rows = new Map<string, string>()

  if (await file.exists()) {
    // A spreadsheet round trip can write CRLF or drop the header, so match it by id
    for (const line of (await file.text()).split(/\r?\n/)) {
      const id = line.split(',')[0]
      if (id && id !== ID_COLUMN) rows.set(id, line)
    }
  }
  for (const { id, label, token } of issued) {
    rows.set(id, [id, label, `${origin}/?t=${token}`].map(csvField).join(','))
  }

  const known: readonly string[] = [...STATUS_ORG_IDS, ADMIN_ID]
  const ordered = [
    ...known.flatMap((id) => rows.get(id) ?? []),
    // Ids that left STATUS_ORG_IDS still hold a token D1 accepts
    ...[...rows].flatMap(([id, line]) => (known.includes(id) ? [] : line)),
  ]
  await Bun.write(path, `${CSV_HEADER}\n${ordered.join('\n')}\n`)
  return path
}

const args = Bun.argv.slice(2)
const remote = args.includes('--remote')
const requested = args.filter((arg) => !arg.startsWith('--'))

const unknown = requested.filter((id) => !isStatusOrg(id))
if (unknown.length > 0) {
  console.error(`Not a status organization: ${unknown.join(', ')}`)
  process.exit(1)
}

let issued: Issued[]
if (args.includes('--admin')) {
  const admin = await issue(ADMIN_ID, '管理者')
  // admin_tokens has no natural key, so old rows can only be replaced wholesale
  execute(
    `DELETE FROM admin_tokens; INSERT INTO admin_tokens (token_hash) VALUES ('${admin.hash}');`,
    remote,
  )
  console.error('Revoked every existing admin token')
  issued = [admin]
} else {
  const ids = requested.length > 0 ? requested : [...STATUS_ORG_IDS]
  issued = await Promise.all(ids.map((id) => issue(id, classOrgLabel(id))))
  const values = issued.map(({ id, hash }) => `('${hash}', '${id}')`).join(', ')
  execute(
    `INSERT INTO org_tokens (token_hash, org_id) VALUES ${values}
     ON CONFLICT (org_id) DO UPDATE SET token_hash = excluded.token_hash;`,
    remote,
  )
}

for (const { id, token } of issued) console.log(`${id}\t${token}`)

const path = await saveCsv(remote, issued)
console.error(`URL: ${ORIGINS[remote ? 'remote' : 'local']}/?t=<token>`)
console.error(`Wrote ${path} (git-ignored)`)
