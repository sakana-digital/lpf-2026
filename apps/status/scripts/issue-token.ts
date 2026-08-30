import { orgIds } from '../../../shared/organizations'

/** Only what this script uses: the repo installs no Bun type package. */
declare const Bun: {
  readonly argv: string[]
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

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function issue(): Promise<{ token: string; hash: string }> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return { token, hash: hex(new Uint8Array(digest)) }
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

const args = Bun.argv.slice(2)
const remote = args.includes('--remote')
const requested = args.filter((arg) => !arg.startsWith('--'))

const unknown = requested.filter((id) => !orgIds.includes(id))
if (unknown.length > 0) {
  console.error(`Unknown organization: ${unknown.join(', ')}`)
  process.exit(1)
}

if (args.includes('--admin')) {
  const { token, hash } = await issue()
  // admin_tokens has no natural key, so old rows can only be replaced wholesale
  execute(
    `DELETE FROM admin_tokens; INSERT INTO admin_tokens (token_hash) VALUES ('${hash}');`,
    remote,
  )
  console.error('Revoked every existing admin token')
  console.log(`admin\t${token}`)
} else {
  const ids = requested.length > 0 ? requested : [...orgIds]
  const issued = await Promise.all(ids.map(async (id) => ({ id, ...(await issue()) })))
  const values = issued.map(({ id, hash }) => `('${hash}', '${id}')`).join(', ')
  execute(
    `INSERT INTO org_tokens (token_hash, org_id) VALUES ${values}
     ON CONFLICT (org_id) DO UPDATE SET token_hash = excluded.token_hash;`,
    remote,
  )
  for (const { id, token } of issued) console.log(`${id}\t${token}`)
}

console.error(`URL: ${remote ? 'https://<worker domain>' : 'http://localhost:8787'}/?t=<token>`)

export {}
