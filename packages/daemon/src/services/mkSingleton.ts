export const mkSingleton = <TConfig, TApi>(
  factory: (config: TConfig) => Promise<TApi>
) => {
  let _service: TApi | undefined = undefined
  return async (config?: TConfig) => {
    return new Promise<TApi>(async (resolve) => {
      if (_service) {
        resolve(_service)
        return
      }
      if (!config) {
        throw new Error(`Attempt to get service before initialization.`)
      }
      _service = await factory(config)
      resolve(_service)
    })
  }
}
