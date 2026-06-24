export const TRUSTED_IP_CLIENT_HEADER = 'x-pockethost-client-ip'

export type TrustedIpList = string[]

/** Max trusted IP entries per active account. */
export const TRUSTED_IPS_MAX = 5

export const maxTrustedIpsForSubscription = (subscription: string | undefined): number => {
  if (!subscription) {
    return 0
  }
  return TRUSTED_IPS_MAX
}

export const canManageTrustedIps = (subscription: string | undefined): boolean =>
  maxTrustedIpsForSubscription(subscription) > 0

const isValidIpv4 = (value: string): boolean => {
  const parts = value.split('.')
  if (parts.length !== 4) return false
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return false
    const n = Number(part)
    if (n < 0 || n > 255) return false
  }
  return true
}

const isValidIpv6 = (value: string): boolean => {
  if (!value.includes(':')) return false
  if (value.includes('..')) return false
  return /^[0-9a-f:]+$/i.test(value)
}

const isUnrestrictedCidr = (entry: string): boolean => {
  const normalized = entry.trim().toLowerCase()
  return normalized === '0.0.0.0/0' || normalized === '::/0'
}

export const normalizeTrustedIpEntry = (entry: string): string => {
  const trimmed = entry.trim()
  if (!trimmed) {
    throw new Error('IP address cannot be empty.')
  }
  if (isUnrestrictedCidr(trimmed)) {
    throw new Error('Unrestricted CIDR ranges are not allowed.')
  }

  const slash = trimmed.indexOf('/')
  const host = slash === -1 ? trimmed : trimmed.slice(0, slash)
  const prefix = slash === -1 ? '' : trimmed.slice(slash + 1)

  if (slash !== -1) {
    if (!/^\d+$/.test(prefix)) {
      throw new Error(`Invalid CIDR prefix in "${entry}".`)
    }
    const prefixNum = Number(prefix)
    const maxPrefix = host.includes(':') ? 128 : 32
    if (prefixNum < 0 || prefixNum > maxPrefix) {
      throw new Error(`Invalid CIDR prefix in "${entry}".`)
    }
  }

  if (isValidIpv4(host)) {
    return slash === -1 ? `${host}/32` : `${host}/${prefix}`
  }

  if (isValidIpv6(host)) {
    return slash === -1 ? `${host}/128` : `${host}/${prefix}`
  }

  throw new Error(`Invalid IP or CIDR: "${entry}".`)
}

export const normalizeTrustedIpList = (raw: unknown): TrustedIpList => {
  if (raw == null) return []
  if (!Array.isArray(raw)) {
    throw new Error('trusted_ips must be an array of IP addresses or CIDR ranges.')
  }

  const normalized: TrustedIpList = []
  const seen = new Set<string>()

  for (const entry of raw) {
    if (typeof entry !== 'string') {
      throw new Error('Each trusted IP must be a string.')
    }
    const value = normalizeTrustedIpEntry(entry)
    if (seen.has(value)) continue
    seen.add(value)
    normalized.push(value)
  }

  return normalized
}

export const validateTrustedIpListForSubscription = (raw: unknown, subscription: string | undefined): TrustedIpList => {
  const normalized = normalizeTrustedIpList(raw)
  const max = maxTrustedIpsForSubscription(subscription)
  if (normalized.length > max) {
    if (max === 0) {
      throw new Error('Account required to manage trusted IPs.')
    }
    throw new Error(`You can add at most ${max} trusted IPs per account.`)
  }
  return normalized
}
