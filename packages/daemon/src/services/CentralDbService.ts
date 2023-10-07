import { PUBLIC_APP_DB } from '$constants'
import { mkSingleton, SingletonBaseConfig } from '@pockethost/common'
import { proxyService } from './ProxyService'

export type CentralDbServiceConfig = SingletonBaseConfig

export const centralDbService = mkSingleton(
  async (config: CentralDbServiceConfig) => {
    const { logger } = config
    const { dbg } = logger.create(`centralDbService`)

    ;(await proxyService()).use(
      PUBLIC_APP_DB,
      ['/api(/*)', '/_(/*)', '/'],
      (req, res, meta, logger) => {
        const { dbg } = logger
        const { coreInternalUrl, proxy } = meta

        const target = coreInternalUrl
        dbg(
          `Forwarding proxy request for ${req.url} to central instance ${target}`,
        )
        proxy.web(req, res, { target })
      },
      `CentralDbService`,
    )

    return {
      shutdown() {},
    }
  },
)
