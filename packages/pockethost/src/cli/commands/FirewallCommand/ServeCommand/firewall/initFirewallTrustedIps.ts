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

  const globalTrustedIps = PH_USER_PROXY_IPS()
  const resolver = createAccountTrustedIpResolver(mirror, globalTrustedIps, logger)

  if (globalTrustedIps.length > 0) {
    logger.create(`firewall`).info(`Operator trusted IPs: ${globalTrustedIps.join(', ')}`)
  }

  return resolver
}
