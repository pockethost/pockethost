import {
  getEffectiveIpLimits,
  parseTrustedIpEntries,
  RateLimitProfile,
  resolveRateLimitProfile,
  SubscriptionType,
  TrustedIpEntry,
  type IpLimitMode,
} from '@'
import express from 'express'
import IPCIDR from 'ip-cidr'
import { isIPv4, isIPv6 } from 'src/common/ipAddress'
import { AsyncReturnType } from 'type-fest'
import { MothershipMirrorService } from 'src/services/MothershipMirrorService'

export type MirrorApi = AsyncReturnType<typeof MothershipMirrorService>

const toProxyCidrString = (entry: string): string => {
  if (entry.includes('/')) return entry
  if (isIPv4(entry)) return `${entry}/32`
  if (isIPv6(entry)) return `${entry}/128`
  return entry
}

const mkCidrMatchers = (entries: string[]): IPCIDR[] => {
  const matchers: IPCIDR[] = []
  for (const raw of entries) {
    const entry = raw.trim()
    if (!entry) continue
    try {
      matchers.push(new IPCIDR(toProxyCidrString(entry)))
    } catch {
      // skip invalid
    }
  }
  return matchers
}

const ipInEntries = (ip: string | undefined, entries: TrustedIpEntry[]): boolean => {
  if (!ip) return false
  const matchers = mkCidrMatchers(entries.map((entry) => entry.cidr))
  return matchers.some((cidr) => cidr.contains(ip))
}

export const getConnectingIp = (req: express.Request): string | undefined => {
  const cf = req.headers['cf-connecting-ip'] || req.headers['true-client-ip']
  if (cf) return Array.isArray(cf) ? cf[0] : cf

  const xff = req.headers['x-forwarded-for']
  const xffStr = Array.isArray(xff) ? xff.join(',') : xff
  if (typeof xffStr === 'string') {
    const ip = xffStr.split(',')?.[0]?.trim()
    if (ip) return ip
  }

  const xri = req.headers['x-real-ip']
  if (xri) return Array.isArray(xri) ? xri[0] : xri

  return req.ip || req.socket?.remoteAddress
}

const headerContains = (header: string | string[] | undefined, token: string): boolean => {
  if (!header) return false
  const tokenLc = token.toLowerCase()
  if (Array.isArray(header)) return header.some((value) => value.toLowerCase().includes(tokenLc))
  return header.toLowerCase().includes(tokenLc)
}

export const isCfImageService = (req: express.Request): boolean => {
  const viaMatches = headerContains(req.headers['via'], 'image-resizing-proxy')
  if (!viaMatches) return false

  const cdnLoopMatches = headerContains(req.headers['cdn-loop'], 'cloudflare')
  if (!cdnLoopMatches) return false

  return true
}

export type RequestPolicy = {
  connectingIp: string | undefined
  endClientIp: string | undefined
  limits: RateLimitProfile
  ipLimits: ReturnType<typeof getEffectiveIpLimits>
  ipLimitMode: IpLimitMode
  trustReason: string
  isProxyMode: boolean
}

export const resolveRequestPolicy = async ({
  req,
  hostname,
  mirror,
  globalProxyIps,
}: {
  req: express.Request
  hostname: string
  mirror: MirrorApi
  globalProxyIps: string[]
}): Promise<RequestPolicy> => {
  const connectingIp = getConnectingIp(req)
  const cfImageService = isCfImageService(req)
  const instance = await mirror.getInstanceByHost(hostname)
  const user = instance ? await mirror.getUser(instance.uid) : undefined
  const tiers = mirror.getRateLimitTiers()
  const subscription = user?.subscription ?? SubscriptionType.Free

  const limits = resolveRateLimitProfile(
    tiers,
    subscription,
    user?.rate_limits,
    instance?.rate_limits
  )

  const instanceProxyIps = parseTrustedIpEntries(instance?.proxy_ips)
  const instanceTrustedIps = parseTrustedIpEntries(instance?.trusted_ips)
  const proxyMatchers = mkCidrMatchers([...globalProxyIps, ...instanceProxyIps.map((entry) => entry.cidr)])
  const isProxyMode =
    !cfImageService && !!connectingIp && proxyMatchers.some((cidr) => cidr.contains(connectingIp))

  let endClientIp = connectingIp
  if (isProxyMode) {
    const customIp = req.headers['x-pockethost-client-ip']
    if (customIp) {
      endClientIp = Array.isArray(customIp) ? customIp[0] : customIp
    }
  }

  let ipLimitMode: IpLimitMode = 'default'
  let trustReason = 'none'

  if (cfImageService) {
    ipLimitMode = 'cf-image'
    trustReason = 'cf-image'
  } else if (isProxyMode) {
    ipLimitMode = 'proxy'
    trustReason = 'instance-proxy'
  } else if (ipInEntries(endClientIp, instanceTrustedIps)) {
    ipLimitMode = 'boost'
    trustReason = 'trusted-ip'
  }

  return {
    connectingIp,
    endClientIp,
    limits,
    ipLimits: getEffectiveIpLimits(limits, ipLimitMode),
    ipLimitMode,
    trustReason,
    isProxyMode,
  }
}
