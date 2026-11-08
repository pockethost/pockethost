import { MOTHERSHIP_URL, PROJECT_CONFIG_FILE } from './constants'
import { savedInstanceName } from './defaultInstanceId'
import {
  findInstance,
  resolveDeployCredential,
  TOKENS_URL,
  type DeployCredential,
  type InstanceSummary,
} from './token'

/**
 * Instance settings over the same mothership endpoints the dashboard uses (`PUT`/`DELETE /api/instance/{id}`, `POST
 * /api/instance`), authenticated with a personal access token. The token needs write access to the instance; creating
 * an instance needs a token for all instances.
 */

export type InstanceFieldsUpdate = {
  power?: boolean
  subdomain?: string
  version?: string
  cname?: string
  dev?: boolean
  syncAdmin?: boolean
  autoVacuum?: boolean
  /** `{ KEY: value | null }`: null removes the secret. Other secrets are left alone. */
  secretsPatch?: Record<string, string | null>
  webhooks?: { endpoint: string; value: string }[]
}

/** Settings the server only changes while the instance is fully off (powered off and idle). */
export const REQUIRES_POWER_OFF: (keyof InstanceFieldsUpdate)[] = [
  'subdomain',
  'version',
  'cname',
  'dev',
  'syncAdmin',
  'autoVacuum',
]

export const needsPowerOff = (fields: InstanceFieldsUpdate) =>
  REQUIRES_POWER_OFF.some((k) => fields[k] !== undefined)

export const isFullyOff = (i: Pick<InstanceSummary, 'power' | 'status'>) =>
  !i.power && ['', 'idle'].includes((i.status || '').toLowerCase())

/** Same rule as the server and the dashboard. */
export const INSTANCE_NAME_PATTERN = /^[a-z][a-z0-9-]{2,39}$/
export const SECRET_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/

export class MothershipError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export const mothershipRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  opts: { token?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<T> => {
  const url = new URL(MOTHERSHIP_URL(path))
  for (const [k, v] of Object.entries(opts.query ?? {}))
    url.searchParams.set(k, v)
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: {
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        ...(opts.body !== undefined
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch (e) {
    throw new Error(`Could not reach PocketHost: ${(e as Error).message}`)
  }
  const body = (await res.json().catch(() => ({}))) as T & {
    message?: string
    data?: Record<string, { message?: string }>
  }
  if (!res.ok) {
    // PocketBase puts field errors in `data`; prefer the most specific message.
    const fieldMsg = Object.values(body.data ?? {}).find(
      (d) => d?.message
    )?.message
    const msg = fieldMsg || body.message || `HTTP ${res.status}`
    // Older mothership: instance endpoints only accepted dashboard logins.
    const dashboardOnly = /record authorization token/i.test(msg)
    throw new MothershipError(
      res.status,
      dashboardOnly
        ? `PocketHost doesn't accept tokens for this yet. Use the dashboard at https://pockethost.io for now.`
        : res.status === 401
          ? `Token rejected: ${msg} Create a new one at ${TOKENS_URL}.`
          : msg
    )
  }
  return body
}

export const updateInstance = (
  cred: DeployCredential,
  id: string,
  fields: InstanceFieldsUpdate
) =>
  mothershipRequest<{ status: string }>('PUT', `/api/instance/${id}`, {
    token: cred.token,
    body: { id, fields },
  })

export const deleteInstance = (cred: DeployCredential, id: string) =>
  mothershipRequest<{ status: string }>('DELETE', `/api/instance/${id}`, {
    token: cred.token,
    body: { id },
  })

export const createInstance = (
  cred: DeployCredential,
  subdomain: string,
  version?: string
) =>
  mothershipRequest<{ instance: { id: string; subdomain: string } }>(
    'POST',
    `/api/instance`,
    { token: cred.token, body: { subdomain, ...(version ? { version } : {}) } }
  )

/** Checks a name is valid and free, or suggests a random free one when `name` is empty. */
export const checkInstanceName = async (name?: string) => {
  const { instanceName } = await mothershipRequest<{
    instanceName: string | number
  }>('GET', `/api/signup`, { query: name ? { name } : {} })
  return `${instanceName}`
}

export const listVersions = async () =>
  (await mothershipRequest<{ versions: string[] }>('GET', `/api/versions`))
    .versions

/** The instance a command acts on: the argument, else the linked one. */
export const resolveTarget = async (name?: string) => {
  const target = (name || savedInstanceName() || '').trim()
  if (!target) {
    throw new Error(
      `No instance given and none linked in ${PROJECT_CONFIG_FILE}. Pass an instance name or run 'pockethost link <instance>'.`
    )
  }
  const cred = await resolveDeployCredential()
  const instance = await findInstance(target, cred)
  return { cred, instance }
}

export const refreshInstance = (cred: DeployCredential, id: string) =>
  findInstance(id, cred)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Polls until `done(instance)` or the timeout. */
export const waitForInstance = async (
  cred: DeployCredential,
  id: string,
  done: (i: InstanceSummary) => boolean,
  opts: { timeoutMs?: number; intervalMs?: number; what?: string } = {}
) => {
  const {
    timeoutMs = 120_000,
    intervalMs = 2_000,
    what = 'the instance',
  } = opts
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const i = await refreshInstance(cred, id)
    if (done(i)) return i
    if (Date.now() > deadline) {
      throw new Error(
        `Timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${what} (status: ${i.status || 'unknown'}).`
      )
    }
    await sleep(intervalMs)
  }
}

/**
 * Applies `fields`. Settings that need the instance off fail with a clear message unless `cycle` is set, which powers
 * it off, waits until it's idle, applies the change and powers it back on (only if it was on).
 */
export const applyInstanceUpdate = async (opts: {
  cred: DeployCredential
  instance: InstanceSummary
  fields: InstanceFieldsUpdate
  cycle?: boolean
  log?: (msg: string) => void
}) => {
  const { cred, instance, fields, cycle } = opts
  const log = opts.log ?? console.log
  if (!needsPowerOff(fields) || isFullyOff(instance)) {
    await updateInstance(cred, instance.id, fields)
    return
  }
  if (!cycle) {
    throw new Error(
      `${instance.subdomain} must be powered off first. Run 'pockethost power off ${instance.subdomain} --wait', or add --cycle to power it off, apply the change and power it back on.`
    )
  }
  const wasOn = instance.power
  if (wasOn) {
    log(`⏻ Powering off ${instance.subdomain}…`)
    await updateInstance(cred, instance.id, { power: false })
  }
  await waitForInstance(cred, instance.id, isFullyOff, {
    what: `${instance.subdomain} to stop`,
  })
  await updateInstance(cred, instance.id, fields)
  if (wasOn) {
    await updateInstance(cred, instance.id, { power: true })
    log(`⏻ Powered ${fields.subdomain ?? instance.subdomain} back on.`)
  }
}

/** Basic five-field cron check, so a typo fails here instead of silently never firing. */
export const isCronExpression = (v: string) => {
  const parts = v.trim().split(/\s+/)
  return (
    parts.length === 5 && parts.every((p) => /^[0-9*/,\-A-Za-z?LW#]+$/.test(p))
  )
}

/** Same rule as the dashboard: a path on the instance, not a full URL. */
export const isWebhookEndpoint = (v: string) => {
  if (!v.startsWith('/') || v.includes('://')) return false
  try {
    new URL(`http://example.com${v}`)
    return true
  } catch {
    return false
  }
}

/** `KEY=value` → [KEY, value]; `KEY` alone → [KEY, null] (value to be prompted). */
export const parseSecretAssignment = (arg: string): [string, string | null] => {
  const i = arg.indexOf('=')
  return i === -1 ? [arg, null] : [arg.slice(0, i), arg.slice(i + 1)]
}
