import { config } from './config'
import { envVar, MOTHERSHIP_URL, TOKEN } from './constants'

export const PAT_PREFIX = 'ph_pat_'
const PAT_RE = /^ph_pat_[a-z0-9]{15}_[0-9A-Za-z]{43}$/
export const TOKENS_URL = 'https://app.pockethost.io/account/tokens'

export const isPat = (v: string) => PAT_RE.test(v.trim())

/** `ph_pat_…abcd` */
export const maskToken = (token: string) =>
  token.startsWith(PAT_PREFIX) ? `${PAT_PREFIX}…${token.slice(-4)}` : '…'

export type DeployCredential = {
  token: string
  /** Where it came from, for messages */
  source: 'POCKETHOST_TOKEN' | 'saved token'
}

export const savedToken = () => config('token') || ''

/** Explains what changed for people upgrading from 3.x, who may still have a password set up. */
export const legacyLoginHint = () => {
  if (envVar('USERNAME') || envVar('PASSWORD')) {
    return ` POCKETHOST_USERNAME/POCKETHOST_PASSWORD are no longer used: the CLI signs in with a token only. Replace them with POCKETHOST_TOKEN.`
  }
  if (config('pb_auth')) {
    return ` Email/password login was removed in CLI 4.0, so your old login no longer works. Run 'pockethost login' to switch to a token.`
  }
  return ''
}

/** The personal access token every command uses: POCKETHOST_TOKEN, then the one saved by `pockethost login`. */
export const resolveDeployCredential = async (): Promise<DeployCredential> => {
  const env = TOKEN().trim()
  if (env) return { token: env, source: 'POCKETHOST_TOKEN' }
  const saved = savedToken().trim()
  if (saved) return { token: saved, source: 'saved token' }
  throw new Error(
    `Not logged in. Run 'pockethost login', or set POCKETHOST_TOKEN in CI. Create a token at ${TOKENS_URL}.${legacyLoginHint()}`
  )
}

const mothershipGet = async <T>(
  path: string,
  token: string,
  query: Record<string, string> = {}
): Promise<T> => {
  const url = new URL(MOTHERSHIP_URL(path))
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  let res: Response
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  } catch (e) {
    throw new Error(`Could not reach PocketHost: ${(e as Error).message}`)
  }
  const body = (await res.json().catch(() => ({}))) as T & {
    message?: string
  }
  if (!res.ok) {
    const msg = body.message || `HTTP ${res.status}`
    throw new Error(
      res.status === 401
        ? `Token rejected: ${msg} Create a new one at ${TOKENS_URL}.`
        : msg
    )
  }
  return body
}

export type TokenWhoami = {
  email: string
  label: string
  hint: string
  scopes: string[]
  instances: { id: string; subdomain: string }[] | null
  expires: string
  /** Present only when a fingerprint was sent */
  sshKey?: { label: string } | null
}

export const tokenWhoami = (token: string, fingerprint?: string) =>
  mothershipGet<TokenWhoami>(
    '/api/pat/whoami',
    token,
    fingerprint ? { fingerprint } : {}
  )

export type InstanceSummary = {
  id: string
  subdomain: string
  cname: string
  status: string
  power: boolean
  version: string
}

/** The instances this token can reach. */
export const listInstances = async (cred?: DeployCredential) => {
  const { token } = cred ?? (await resolveDeployCredential())
  const { instances } = await mothershipGet<{ instances: InstanceSummary[] }>(
    '/api/pat/instances',
    token
  )
  return instances
}

/** Finds an instance by ID, subdomain or custom domain among the ones this token can reach. */
export const findInstance = async (search: string, cred?: DeployCredential) => {
  const s = search.trim().toLowerCase()
  const instance = (await listInstances(cred)).find(
    (i) => i.id === search || i.subdomain === s || (!!i.cname && i.cname === s)
  )
  if (!instance) {
    throw new Error(
      `Instance '${search}' not found, or your token can't access it.`
    )
  }
  return instance
}

export const formatInstance = (i: InstanceSummary) =>
  `${i.subdomain} (${i.id})${i.cname ? ` (${i.cname})` : ''} (${(i.status || (i.power ? 'on' : 'off')).toUpperCase()})`

export const describeToken = (w: TokenWhoami) => {
  const scope = w.instances
    ? w.instances.map((i) => i.subdomain).join(', ') || '(no instances)'
    : 'all instances'
  const expires = w.expires ? `expires ${w.expires.slice(0, 10)}` : 'no expiry'
  return `"${w.label}" (${PAT_PREFIX}…${w.hint}) for ${w.email}: ${w.scopes.join(', ')} on ${scope}, ${expires}`
}
