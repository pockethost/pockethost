// import { emitter, NativePocketBaseEvents } from './index'

// export const CoreMiddleware = {
//   requireAdminOrUserAuth: () => 'RequireAdminOrUserAuth',
// }

// export type JsMiddlewareToken = string

// export type JsHttpRoutePath = string

// export type JsAddRouteConfig = {
//   method: HttpMethods
//   path: JsHttpRoutePath
//   handler: (context: HttpRequestContext) => void
//   middlewares: JsMiddlewareToken[]
// }

// export type OnBeforeServeEvent = {
//   Router: {
//     addRoute: (config: JsAddRouteConfig) => void
//   }
// }

// export const onBeforeServe = (cb: (e: OnBeforeServeEvent) => void) => {
//   emitter.on(NativePocketBaseEvents.OnBeforeServe, cb)
// }

// export const dispatchObBeforeServe = ()=>{
//   case NativePocketBaseEvents.OnBeforeServe:
//     const e: OnBeforeServeEvent = {
//       Router: {
//         addRoute: (config) => {
//           const packed = pack(config)
//           console.log(`Sending config back ${packed}`)
//           __go_addRoute(packed)
//         },
//       },
//     }
//     emitter.emit(eventName, e)
// }
