import { DAEMON_IPCIDR_LIST } from '$constants'
import { assert } from '$util'
import {
  SingletonBaseConfig,
  logger as mkLogger,
  mkSingleton,
} from '@pockethost/common'
import IPCIDR from 'ip-cidr'
import { proxyService } from '../ProxyService'
export type IpWhitelistServiceConfig = SingletonBaseConfig & {
  ipRanges: string[]
}

const IP_WHITELIST_SERVICE_NAME = 'IpWhitelistService'

export const ipWhitelistService = mkSingleton(
  async (_config: Partial<IpWhitelistServiceConfig>) => {
    const config: IpWhitelistServiceConfig = {
      ipRanges: DAEMON_IPCIDR_LIST,
      logger: _config.logger || mkLogger(),
      ..._config,
    }
    const { logger, ipRanges } = config
    const _serviceLogger = logger.create(IP_WHITELIST_SERVICE_NAME)
    const { dbg, error, warn, abort } = _serviceLogger

    dbg(`Initializing ${IP_WHITELIST_SERVICE_NAME}`, ipRanges)

    if (ipRanges.length > 0) {
      const { use } = await proxyService()

      const validators = ipRanges.map((ip) => new IPCIDR(ip))

      const validate = (() => {
        const seen_ips: { [_: string]: boolean } = {}
        return (ip: string) =>
          seen_ips[ip] ||
          !!validators.find((validator) => validator.contains(ip))
      })()

      use(
        (subdomain) => true,
        ['/*'],
        async (req, res, meta, logger) => {
          const ipAddress = req.socket.remoteAddress
          assert(ipAddress, `No remote IP address. Request blocked.`)
          dbg(`Validating IP address ${ipAddress}`)
          if (!validate(ipAddress)) {
            throw new Error(
              `Request from IP ${ipAddress} blocked because it is not in range.`,
            )
          }
        },
        IP_WHITELIST_SERVICE_NAME,
      )
    }

    return {
      shutdown: async () => {},
    }
  },
)
