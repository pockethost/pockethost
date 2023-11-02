export function mergeConfig<T>(
  defaultConfig: T,
  ...partialConfigs: Partial<T>[]
): T {
  const result: T = { ...defaultConfig }

  for (const partialConfig of partialConfigs) {
    for (const key in partialConfig) {
      if (Object.prototype.hasOwnProperty.call(partialConfig, key)) {
        const value = partialConfig[key as keyof typeof partialConfig]
        if (value !== undefined) {
          result[key as keyof T] = value as T[keyof T]
        }
      }
    }
  }

  return result
}
