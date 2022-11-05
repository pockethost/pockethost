import { createServer } from 'http'
import httpProxy from 'http-proxy'
import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from './constants'
import { createInstanceManger } from './InstanceManager'
import { dbg, info } from './util/dbg'

export const createProxyServer = async () => {
  const instanceManager = await createInstanceManger()

  const proxy = httpProxy.createProxyServer({})

  const server = createServer(async (req, res) => {
    dbg(`Incoming request ${req.headers.host}/${req.url}`)

    const die = (msg: string) => {
      console.error(`ERROR: ${msg}`)
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
      const instance = await instanceManager.getInstance(subdomain)
      if (!instance) {
        throw new Error(
          `${host} not found. Please check the instance URL and try again, or create one at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN}.`
        )
      }

      dbg(
        `Forwarding proxy request for ${req.url} to instance ${instance.internalUrl}`
      )
      const endRequest = instance.startRequest()
      req.on('close', endRequest)
      proxy.web(req, res, { target: instance.internalUrl })
    } catch (e) {
      die(`${e}`)
      return
    }
  })

  info('daemon on port 3000')
  server.listen(3000)

  const shutdown = () => {
    info(`Shutting down proxy server`)
    server.close()
    instanceManager.shutdown()
  }

  return { shutdown }
}
