export enum EchoHttpMethods {
  Get = 'GET',
}

export enum EchoHttpResponseStatuses {
  Ok = 200,
  Error = 400,
}

export type EchoHandlerFunc = (context: EchoContext) => void

export type EchoMiddlewareFunc = (next: EchoHandlerFunc) => EchoHandlerFunc

export type EchoContext = {
  get: <T>(key: string) => T
  string: (code: number, s: string) => void
  json: (status: EchoHttpResponseStatuses, data: object) => void
}

export type EchoRoute = {
  method: EchoHttpMethods
  path: string
  handler: EchoHandlerFunc
  middlewares: EchoMiddlewareFunc[]
}
