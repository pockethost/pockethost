import { isIPv4, isIPv6 } from '../ipAddress'
import { SubscriptionType } from './User'

export type RateLimitPartial = Partial<{
  ipBurst: number
  hostnameBurst: number
  ipHourly: number
  hostnameHourly: number
  ipConcurrent: number
  hostnameConcurrent: number
  ipBoostMultiplier: number
}>

export type RateLimitProfile = {
  ipBurst: number
  hostnameBurst: number
  ipHourly: number
  hostnameHourly: number
  ipConcurrent: number
  hostnameConcurrent: number
  ipBoostMultiplier: number
}

export type RateLimitTiers = {
  default: RateLimitPartial
  free?: RateLimitPartial
  premium?: RateLimitPartial
  founder?: RateLimitPartial
  flounder?: RateLimitPartial
  legacy?: RateLimitPartial
}

export type TrustedIpEntry = {
  cidr: string
  label?: string
}

export const RATE_LIMIT_TIERS_SETTING = 'rate_limit_tiers'

export const DEFAULT_RATE_LIMIT_PROFILE: RateLimitProfile = {
  ipBurst: 120,
  hostnameBurst: 1200,
  ipHourly: 1000,
  hostnameHourly: 10000,
  ipConcurrent: 15,
  hostnameConcurrent: 250,
  ipBoostMultiplier: 5,
}

export const TRUSTED_IPS_PRO_LEGACY_MAX = 5
export const TRUSTED_IPS_FOUNDER_FLOUNDER_MAX = 20
export const PROXY_IPS_PAID_MAX = 3

export type IpLimitMode = 'default' | 'boost' | 'proxy' | 'cf-image'

export const isFounderFlounderSubscription = (subscription: SubscriptionType): boolean =>
  subscription === SubscriptionType.Founder || subscription === SubscriptionType.Flounder

export const isProLegacySubscription = (subscription: SubscriptionType): boolean =>
  subscription === SubscriptionType.Premium || subscription === SubscriptionType.Legacy

export const isPaidSubscription = (subscription: SubscriptionType): boolean =>
  isProLegacySubscription(subscription) || isFounderFlounderSubscription(subscription)

export const getTrustedIpsMax = (subscription: SubscriptionType): number =>
  isFounderFlounderSubscription(subscription)
    ? TRUSTED_IPS_FOUNDER_FLOUNDER_MAX
    : TRUSTED_IPS_PRO_LEGACY_MAX

export const mergeRateLimitPartial = (
  base: RateLimitProfile,
  ...partials: (RateLimitPartial | null | undefined)[]
): RateLimitProfile => {
  let result: RateLimitProfile = { ...base }
  for (const partial of partials) {
    if (!partial) continue
    result = { ...result, ...partial }
  }
  return result
}

export const resolveRateLimitProfile = (
  tiers: RateLimitTiers | null | undefined,
  subscription: SubscriptionType,
  userLimits?: RateLimitPartial | null,
  instanceLimits?: RateLimitPartial | null
): RateLimitProfile => {
  const base = mergeRateLimitPartial(DEFAULT_RATE_LIMIT_PROFILE, tiers?.default)
  const tierPartial = tiers?.[subscription as keyof RateLimitTiers] ?? {}
  return mergeRateLimitPartial(base, tierPartial, userLimits, instanceLimits)
}

export const getEffectiveIpLimits = (profile: RateLimitProfile, mode: IpLimitMode) => {
  const multiplier = mode === 'boost' || mode === 'cf-image' ? profile.ipBoostMultiplier : 1
  return {
    ipBurst: profile.ipBurst * multiplier,
    ipHourly: profile.ipHourly * multiplier,
    ipConcurrent: profile.ipConcurrent * multiplier,
  }
}

export const normalizeCidr = (entry: string): string | null => {
  const trimmed = entry.trim()
  if (!trimmed) return null

  if (trimmed.includes('/')) {
    const [ipPart, prefixPart] = trimmed.split('/')
    if (!ipPart || prefixPart === undefined) return null
    const prefix = Number(prefixPart)
    if (!Number.isInteger(prefix)) return null
    if (isIPv4(ipPart)) {
      if (prefix < 0 || prefix > 32) return null
      return `${ipPart}/${prefix}`
    }
    if (isIPv6(ipPart)) {
      if (prefix < 0 || prefix > 128) return null
      return `${ipPart}/${prefix}`
    }
    return null
  }

  if (isIPv4(trimmed)) return `${trimmed}/32`
  if (isIPv6(trimmed)) return `${trimmed}/128`
  return null
}

export const parseTrustedIpEntries = (raw: unknown): TrustedIpEntry[] => {
  if (!raw) return []
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        const cidr = normalizeCidr(item)
        return cidr ? { cidr } : null
      }
      if (item && typeof item === 'object' && typeof (item as TrustedIpEntry).cidr === 'string') {
        const cidr = normalizeCidr((item as TrustedIpEntry).cidr)
        if (!cidr) return null
        const label = (item as TrustedIpEntry).label
        return { cidr, ...(label ? { label: String(label).trim() } : {}) }
      }
      return null
    })
    .filter((item): item is TrustedIpEntry => item !== null)
}

export const sanitizeTrustedIpEntries = (entries: TrustedIpEntry[]): TrustedIpEntry[] => {
  const seen = new Set<string>()
  const result: TrustedIpEntry[] = []

  for (const entry of entries) {
    const cidr = normalizeCidr(entry.cidr)
    if (!cidr || seen.has(cidr)) continue
    seen.add(cidr)
    result.push({
      cidr,
      ...(entry.label?.trim() ? { label: entry.label.trim() } : {}),
    })
  }

  return result
}

export type ValidateFirewallAccessResult =
  | { ok: true; trusted_ips: TrustedIpEntry[]; proxy_ips: TrustedIpEntry[] }
  | { ok: false; message: string }

export const validateFirewallAccessFields = ({
  trusted_ips,
  proxy_ips,
  subscription,
}: {
  trusted_ips: unknown
  proxy_ips: unknown
  subscription: SubscriptionType
}): ValidateFirewallAccessResult => {
  const trusted = sanitizeTrustedIpEntries(parseTrustedIpEntries(trusted_ips))
  const proxy = sanitizeTrustedIpEntries(parseTrustedIpEntries(proxy_ips))
  const paid = isPaidSubscription(subscription)
  const trustedMax = getTrustedIpsMax(subscription)

  if (trusted.length > trustedMax) {
    return { ok: false, message: `Trusted IP limit is ${trustedMax} for your plan.` }
  }

  if (proxy.length > 0 && !paid) {
    return { ok: false, message: 'SSR / proxy mode requires a Pro plan or higher.' }
  }

  if (proxy.length > PROXY_IPS_PAID_MAX) {
    return { ok: false, message: `Proxy IP limit is ${PROXY_IPS_PAID_MAX}.` }
  }

  const trustedSet = new Set(trusted.map((entry) => entry.cidr))
  for (const entry of proxy) {
    if (trustedSet.has(entry.cidr)) {
      return { ok: false, message: `IP ${entry.cidr} cannot be both trusted and a proxy.` }
    }
  }

  return { ok: true, trusted_ips: trusted, proxy_ips: proxy }
}
