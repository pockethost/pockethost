import { createServer } from 'http'
import httpProxy from 'http-proxy'
import { PUBLIC_APP_DOMAIN, PUBLIC_APP_PROTOCOL } from './constants'
import { createInstanceManger } from './InstanceManager'

export const createProxyServer = async () => {
  const instanceManager = await createInstanceManger()

  const proxy = httpProxy.createProxyServer({})

  const server = createServer(async (req, res) => {
    console.log(`Incoming request ${req.headers.host}/${req.url}`)

    const die = (msg: string) => {
      console.error(`ERROR: ${msg}`)
      res.writeHead(200, {
        'Content-Type': `text/plain`,
      })
      res.end(msg)
    }
    const host = req.headers.host
    if (!host) {
      die(`Host not found`)
      return
    }
    const [subdomain, ...junk] = host.split('.')
    if (!subdomain) {
      die(`${host} has no subdomain.`)
      return
    }
    const instance = await instanceManager.getInstance(subdomain)
    if (!instance) {
      die(
        `${host} not found. Please check the instance URL and try again, or create one at ${PUBLIC_APP_PROTOCOL}://${PUBLIC_APP_DOMAIN}`
      )
      return
    }
    console.log(
      `Forwarding proxy request for ${req.url} to instance ${instance.internalUrl}`
    )
    const endRequest = instance.startRequest()
    req.on('close', endRequest)
    proxy.web(req, res, { target: instance.internalUrl })
  })

  console.log('daemon on port 3000')
  server.listen(3000)

  const shutdown = () => {
    console.log(`Shutting down proxy server`)
    server.close()
    instanceManager.shutdown()
  }

  return { shutdown }
}
