import { config } from './config'
import { MOTHERSHIP_URL, TOKEN, USERNAME } from './constants'
import { getClient } from './getClient'

export const PAT_PREFIX = 'ph_pat_'
const PAT_RE = /^ph_pat_[a-z0-9]{15}_[0-9A-Za-z]{43}$/

export const isPat = (v: string) => PAT_RE.test(v.trim())

/** `ph_pat_…abcd` */
export const maskToken = (token: string) =>
  token.startsWith(PAT_PREFIX) ? `${PAT_PREFIX}…${token.slice(-4)}` : '…'

export type DeployCredential = {
  token: string
  kind: 'pat' | 'login'
  /** Where it came from, for messages */
  source: string
}

export const savedToken = () => config('token') || ''

/**
 * Picks the credential for the deploy API: POCKETHOST_TOKEN, then a saved token, then the email/password login
 * (POCKETHOST_USERNAME/PASSWORD or `pockethost login`). Tokens never need a password or SSH key, so they work on
 * fresh CI runners.
 */
export const resolveDeployCredential = async (): Promise<DeployCredential> => {
  const env = TOKEN().trim()
  if (env) return { token: env, kind: 'pat', source: 'POCKETHOST_TOKEN' }
  const saved = savedToken().trim()
  if (saved && !USERNAME())
    return { token: saved, kind: 'pat', source: 'saved token' }

  const client = await getClient()
  if (client.authStore.isValid && client.authStore.token) {
    const email = (client.authStore.record?.email as string) || 'login'
    return { token: client.authStore.token, kind: 'login', source: email }
  }
  throw new Error(
    `Not authenticated. Set POCKETHOST_TOKEN (create a token at https://app.pockethost.io/account/tokens), run 'pockethost token set', or run 'pockethost login'.`
  )
}

export type TokenWhoami = {
  email: string
  label: string
  hint: string
  scopes: string[]
  instances: { id: string; subdomain: string }[] | null
  expires: string
}

export const tokenWhoami = async (token: string): Promise<TokenWhoami> => {
  const res = await fetch(MOTHERSHIP_URL('/api/pat/whoami'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = (await res.json().catch(() => ({}))) as TokenWhoami & {
    message?: string
  }
  if (!res.ok) {
    throw new Error(body.message || `Token check failed (HTTP ${res.status})`)
  }
  return body
}

export const describeToken = (w: TokenWhoami) => {
  const scope = w.instances
    ? w.instances.map((i) => i.subdomain).join(', ') || '(no instances)'
    : 'all instances'
  const expires = w.expires ? `expires ${w.expires.slice(0, 10)}` : 'no expiry'
  return `"${w.label}" (${PAT_PREFIX}…${w.hint}) for ${w.email}: ${w.scopes.join(', ')} on ${scope}, ${expires}`
}
