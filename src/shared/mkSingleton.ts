export type SingletonApi = Object

export type SingletonBaseConfig = {}

export function mkSingleton<TConfig, TInstance>(
  factory: (config: TConfig) => TInstance,
): (config?: TConfig) => TInstance {
  let instance: TInstance | undefined

  return (config?: TConfig): TInstance => {
    if (instance && config) {
      console.warn('Attempted to initialize service twice.')
      console.warn(new Error().stack)
      return instance
    }

    if (!instance && !config) {
      console.warn(new Error().stack)
      throw new Error('Attempted to use service before initialization.')
    }

    if (!instance) {
      instance = factory(config as TConfig)
    }

    return instance
  }
}
