import {
  ErrorRequestHandler,
  IS_DEV,
  PocketHostAction,
  PocketHostFilter,
  action,
  cors,
  express,
  filter,
  forEach,
} from 'pockethost/core'
import { info } from '../../..'
import { createVhostProxyMiddleware } from './createVhostProxyMiddleware'

export const firewall = async () => {
  const hostnameRoutes = await filter<{ [_: string]: string }>(
    PocketHostFilter.Waf_VHosts,
    {},
  )

  // Create Express app
  const app = express()

  await action(PocketHostAction.Waf_OnAppMiddleware, app)

  app.options('*', cors()) // include before other routes
  app.use(cors())

  forEach(hostnameRoutes, (target, host) => {
    app.use(createVhostProxyMiddleware(host, target, IS_DEV()))
  })

  app.get(`/_api/health`, (req, res, next) => {
    res.json({ status: 'ok' })
    res.end()
  })

  // Fall-through
  app.all(`*`, (req, res, next) => {
    throw new Error(`No route for ${req.method} ${req.url}`)
  })

  const errorHandler: ErrorRequestHandler = async (err, req, res, next) => {
    action(PocketHostAction.Waf_OnRequestError, { err })
    res
      .status(500)
      .send(await filter(PocketHostFilter.Waf_OnError_Message, err.toString()))
  }
  app.use(errorHandler)

  const isMounted = await filter(PocketHostFilter.Waf_AppMount, false, app)
  if (!isMounted) {
    app.listen(80, () => {
      info(`Listening on port 80`)
    })
  }
}
