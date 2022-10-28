import {
  EchoHttpMethods,
  EchoHttpResponseStatuses,
  EchoMiddlewareFunc,
  EchoRoute,
  User,
} from './types'

export type HandlerApi = {
  ok: (s: string) => void
  error: (s: string) => void
  user: () => User
}

export type HandlerFunc = (api: HandlerApi) => void

export type Route = {
  method: EchoHttpMethods
  path: string
  handler: HandlerFunc
  middlewares: EchoMiddlewareFunc[]
}

export const addRoute = (route: Route) => {
  // Ensure path begins with `/api/`
  const { path } = route
  if (!path.startsWith(`/api/`)) {
    console.log(`API error ${path}`)
    throw new Error(`All routes must take the form /api/<path...>`)
  }

  const _route: EchoRoute = {
    method: route.method,
    path: route.path,
    handler: (c) => {
      const api: HandlerApi = {
        ok: (message) => {
          c.string(EchoHttpResponseStatuses.Ok, message)
        },
        error: (message) => {
          c.string(EchoHttpResponseStatuses.Error, message)
        },
        user: () => c.get<User>('user'),
      }
      route.handler(api)
    },
    middlewares: route.middlewares,
  }
  return __go.addRoute(_route)
}

export const auth = __go.requireAdminOrUserAuth()

export const get = (
  path: string,
  handler: HandlerFunc,
  middlewares?: EchoMiddlewareFunc[]
) => {
  addRoute({
    method: EchoHttpMethods.Get,
    path: `/api${path}`,
    handler: (api) => {
      try {
        handler(api)
      } catch (e) {
        api.error(`${e}`)
      }
    },
    middlewares: middlewares || [],
  })
}
