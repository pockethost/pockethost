type Logger = (...args: any[]) => void

interface Lib {
  mkLog: (namespace: string) => Logger
  adminSync: (app: any, legacy: boolean) => void
}
