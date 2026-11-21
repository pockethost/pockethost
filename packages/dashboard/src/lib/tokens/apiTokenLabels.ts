import type { InstanceFields, RecordId } from '@pockethost/server/common'

/** Where the mothership serves its API tokens (PocketOne's ext/api-tokens, api-tokens/v1). */
export const API_TOKENS_PATH = '/api/_c/api-tokens/v1'

/** The instance scopes the mothership registers; a value is an instance id ("instances=abc123"). */
export const SCOPE_INSTANCES = 'instances'
export const SCOPE_INSTANCES_READ = 'instances:read'

/** A token as GET /api/_c/api-tokens/v1 lists it (never the secret). */
export type ApiToken = {
  id: string
  name: string
  prefix: string // the secret's first characters, for display
  scopes: string[] // empty: the owner's full rights
  expires: string
  lastUsed: string
  created: string
}

/** The scopes for a new token: deploy (or read only) on every instance or on some. */
export const tokenScopes = (canDeploy: boolean, allInstances: boolean, instanceIds: string[]): string[] => {
  const name = canDeploy ? SCOPE_INSTANCES : SCOPE_INSTANCES_READ
  return allInstances ? [name] : instanceIds.map((id) => `${name}=${id}`)
}

const splitScope = (scope: string): [string, string] => {
  const i = scope.indexOf('=')
  return i < 0 ? [scope, ''] : [scope.slice(0, i), scope.slice(i + 1)]
}

export const EXPIRY_OPTIONS = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '1 year', days: 365 },
  { label: 'No expiry', days: 0 },
] as const

export const DEFAULT_EXPIRY_DAYS = 90

/** ISO date `days` from `now`, or '' for no expiry. */
export const expiryFromDays = (days: number, now = Date.now()) =>
  days > 0 ? new Date(now + days * 24 * 60 * 60 * 1000).toISOString() : ''

/** Case-insensitive, by subdomain. Returns a new array. */
export const sortBySubdomain = <T extends Pick<InstanceFields, 'subdomain'>>(instances: T[]): T[] =>
  [...instances].sort((a, b) =>
    (a.subdomain ?? '').localeCompare(b.subdomain ?? '', undefined, { sensitivity: 'base', numeric: true })
  )

export const tokenAccessLabel = (token: Pick<ApiToken, 'scopes'>) =>
  token.scopes.length === 0 || token.scopes.some((s) => splitScope(s)[0] === SCOPE_INSTANCES)
    ? 'Deploy + read'
    : 'Read only'

export const tokenScopeLabel = (token: Pick<ApiToken, 'scopes'>, instancesById: Record<RecordId, InstanceFields>) => {
  const scopes = token.scopes.map(splitScope)
  if (scopes.length === 0 || scopes.some(([, value]) => value === '')) return 'All instances'
  const ids = [...new Set(scopes.map(([, value]) => value))]
  const names = sortBySubdomain(
    ids.map((id) => instancesById[id]).filter((i): i is InstanceFields => !!i?.subdomain)
  ).map((i) => i.subdomain)
  if (names.length === 0) return ids.length === 1 ? '1 instance' : `${ids.length} instances`
  return names.join(', ')
}

const parsePbDate = (v: string) => Date.parse(v.replace(' ', 'T'))

export const tokenExpiryLabel = (expires: string, now = Date.now()) => {
  if (!expires) return 'Never expires'
  const t = parsePbDate(expires)
  if (Number.isNaN(t)) return 'Never expires'
  const date = new Date(t).toISOString().slice(0, 10)
  return t <= now ? `Expired ${date}` : `Expires ${date}`
}

export const tokenLastUsedLabel = (lastUsed: string) => {
  if (!lastUsed) return 'Never used'
  const t = parsePbDate(lastUsed)
  return Number.isNaN(t) ? 'Never used' : `Last used ${new Date(t).toISOString().slice(0, 10)}`
}
