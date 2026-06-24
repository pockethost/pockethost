import { Logger, type UserFields, type UserId } from '@'
import IPCIDR from 'ip-cidr'
import type { MothershipMirrorService } from 'src/services/MothershipMirrorService'
import { toProxyCidrString } from './rateLimiterPure'

const compileTrustedIpCidrs = (entries: string[], logger: Logger): IPCIDR[] => {
  const cidrs: IPCIDR[] = []
  for (const raw of entries) {
    const entry = raw.trim()
    if (!entry) continue
    try {
      cidrs.push(new IPCIDR(toProxyCidrString(entry)))
    } catch (err) {
      logger.create(`TrustedIps`).warn(`Invalid trusted IP entry, skipping: ${entry}`, err)
    }
  }
  return cidrs
}

export type AccountTrustedIpResolver = {
  isTrustedConnectingIp: (connectingIp: string | undefined, hostname: string) => Promise<boolean>
  refreshUser: (user: UserFields) => void
}

export const createAccountTrustedIpResolver = (
  mirror: Awaited<ReturnType<typeof MothershipMirrorService>>,
  globalTrustedIps: string[],
  logger: Logger
): AccountTrustedIpResolver => {
  const resolverLogger = logger.create(`TrustedIps`)
  const globalCidrs = compileTrustedIpCidrs(globalTrustedIps, resolverLogger)
  const userCidrs = new Map<UserId, IPCIDR[]>()

  const refreshUser = (user: UserFields) => {
    const entries = Array.isArray(user.trusted_ips) ? user.trusted_ips : []
    userCidrs.set(user.id, compileTrustedIpCidrs(entries, resolverLogger))
  }

  for (const user of mirror.getUsers()) {
    refreshUser(user)
  }

  mirror.onUserUpserted((user) => {
    refreshUser(user)
  })

  mirror.onUserDeleted((userId) => {
    userCidrs.delete(userId)
  })

  const isTrustedConnectingIp = async (connectingIp: string | undefined, hostname: string): Promise<boolean> => {
    if (!connectingIp) return false

    if (globalCidrs.some((cidr) => cidr.contains(connectingIp))) {
      return true
    }

    const instance = await mirror.getInstanceByHost(hostname)
    if (!instance) return false

    const accountCidrs = userCidrs.get(instance.uid) ?? []
    return accountCidrs.some((cidr) => cidr.contains(connectingIp))
  }

  return {
    isTrustedConnectingIp,
    refreshUser,
  }
}
