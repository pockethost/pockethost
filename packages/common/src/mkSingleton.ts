export type SingletonApi = Object

export type SingletonBaseConfig = {}

export const mkSingleton = <
  TConfig,
  TApi extends SingletonApi | Promise<SingletonApi>,
>(
  factory: (config: TConfig) => TApi,
) => {
  let _service: TApi | undefined = undefined
  return (config?: TConfig) => {
    if (_service && config) {
      throw new Error(`Attempted to initialize service twice`)
    }
    if (!_service) {
      if (!config) {
        throw new Error(`Attempted to use service before initialization`)
      }
      _service = factory(config)
    }
    return _service
  }
}
