import { Dao } from './go-namespaces/Dao'
import { EchoMiddlewareFunc, EchoRoute } from './go-namespaces/Echo'

export type GoApi = {
  app: {
    dao: () => Dao
  }
  addRoute: (route: EchoRoute) => void
  ping: () => string
  onModelBeforeCreate: any
  requireAdminAuth: () => EchoMiddlewareFunc
  requireAdminAuthOnlyIfAny: () => EchoMiddlewareFunc
  requireAdminOrOwnerAuth: () => EchoMiddlewareFunc
  requireAdminOrUserAuth: () => EchoMiddlewareFunc
  newNullStringMapArrayPtr: <TFields>() => TFields[]
  newNullStringMap: <TFields>() => TFields
}
