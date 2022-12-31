import {
  PUBLIC_APP_DOMAIN,
  PUBLIC_APP_PROTOCOL,
  PUBLIC_PB_SUBDOMAIN,
} from '$constants'
import { instanceService } from '$services'
import { logger, mkSingleton } from '@pockethost/common'
import { createServer } from 'http'
import httpProxy from 'http-proxy'
import { AsyncReturnType } from 'type-fest'

export type ProxyServiceApi = AsyncReturnType<typeof proxyService>

export type ProxyServiceConfig = {
  coreInternalUrl: string
}
export const proxyService = mkSingleton(async (config: ProxyServiceConfig) => {
  const { dbg, error, info } = logger().create('ProxyService')

  const { coreInternalUrl } = config

  const proxy = httpProxy.createProxyServer({})

  const { getInstance } = await instanceService()

  const server = createServer(async (req, res) => {
    dbg(`Incoming request ${req.headers.host}/${req.url}`)

    const die = (msg: string) => {
      error(msg)
      res.writeHead(403, {
        'Content-Type': `text/plain`,
      })
      res.end(msg)
    }

    const host = req.headers.host
    if (!host) {
      throw new Error(`Host not found`)
    }
    const [subdomain, ...junk] = host.split('.')
    if (!subdomain) {
      throw new Error(`${host} has no subdomain.`)
    }
    try {
      if (subdomain === PUBLIC_PB_SUBDOMAIN) {
        const target = coreInternalUrl
        dbg(`Forwarding proxy request for ${req.url} to instance ${target}`)
        proxy.web(req, res, { target })
        return
      }

      const instance = await getInstance(subdomain)
      if (!instance) {
        throw new Error(
          `${host} not found. Please check the instance URL and try again, or create one at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN}.`
        )
      }

      if (req.closed) {
        throw new Error(`Request already closed.`)
      }

      dbg(
        `Forwarding proxy request for ${req.url} to instance ${instance.internalUrl}`
      )

      const endRequest = instance.startRequest()
      res.on('close', endRequest)
      proxy.web(req, res, { target: instance.internalUrl })
    } catch (e) {
      die(`${e}`)
      return
    }
  })

  info('daemon on port 3000')
  server.listen(3000)

  const shutdown = async () => {
    info(`Shutting down proxy server`)
    return new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) error(err)
        resolve()
      })
      server.closeAllConnections()
    })
  }

  return { shutdown }
})
