import { PUBLIC_APP_DB } from '$constants'
import { logger, mkSingleton } from '@pockethost/common'
import { proxyService } from './ProxyService'

export const centralDbService = mkSingleton(async () => {
  const { dbg } = logger().create(`centralDbService`)

  ;(await proxyService()).use(
    PUBLIC_APP_DB,
    ['/api(/*)', '/_(/*)', '/'],
    (req, res, meta) => {
      const { subdomain, coreInternalUrl, proxy } = meta

      if (subdomain !== PUBLIC_APP_DB) return

      const target = coreInternalUrl
      dbg(
        `Forwarding proxy request for ${req.url} to central instance ${target}`
      )
      proxy.web(req, res, { target })
    },
    `CentralDbService`
  )

  return {
    shutdown() {},
  }
})
