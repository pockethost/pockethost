import type { ApiTokenFields, InstanceFields, RecordId } from '@pockethost/server/common'

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

export const tokenAccessLabel = (token: Pick<ApiTokenFields, 'scopes'>) =>
  token.scopes?.includes('write') ? 'Deploy + read' : 'Read only'

export const tokenScopeLabel = (
  token: Pick<ApiTokenFields, 'all_instances' | 'instances'>,
  instancesById: Record<RecordId, InstanceFields>
) => {
  if (token.all_instances) return 'All instances'
  const names = sortBySubdomain(
    (token.instances ?? []).map((id) => instancesById[id]).filter((i): i is InstanceFields => !!i?.subdomain)
  ).map((i) => i.subdomain)
  if (names.length === 0) {
    const count = token.instances?.length ?? 0
    return count === 1 ? '1 instance' : `${count} instances`
  }
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
