import {
  Logger,
  MOTHERSHIP_ADMIN_PASSWORD,
  MOTHERSHIP_ADMIN_USERNAME,
  MOTHERSHIP_URL,
  MothershipAdminClientService,
  PH_USER_PROXY_IPS,
  tryFetch,
} from '@'
import { MothershipMirrorService } from 'src/services/MothershipMirrorService'
import { createAccountTrustedIpResolver } from './accountTrustedIps'

export const initFirewallTrustedIps = async (logger: Logger) => {
  await tryFetch(MOTHERSHIP_URL(`/api/health`), { logger })

  await MothershipAdminClientService({
    url: MOTHERSHIP_URL(),
    username: MOTHERSHIP_ADMIN_USERNAME(),
    password: MOTHERSHIP_ADMIN_PASSWORD(),
    logger,
  })

  const { client } = await MothershipAdminClientService()
  const mirror = await MothershipMirrorService({ client: client.client, logger })
  await mirror.bootSync()
  await mirror.whenReady

  // Events published while the SSE stream was down are lost. The firewall runs no instances; catching up fetches only
  // what changed in the gap (a full dump only after a long gap).
  mirror.onResynced(() => {
    mirror.catchUp().catch((e) => {
      logger.create(`firewall`).error(`Error syncing mirror after mothership reconnect`, { e })
    })
  })

  const globalTrustedIps = PH_USER_PROXY_IPS()
  const resolver = createAccountTrustedIpResolver(mirror, globalTrustedIps, logger)

  if (globalTrustedIps.length > 0) {
    logger.create(`firewall`).info(`Operator trusted IPs: ${globalTrustedIps.join(', ')}`)
  }

  // The mirror also carries the edge list for routing requests to the edge that runs each instance.
  return Object.assign(resolver, { mirror })
}
