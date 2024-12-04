type Logger = (...args: any[]) => void

interface Lib {
  mkLog: (namespace: string) => Logger
}
